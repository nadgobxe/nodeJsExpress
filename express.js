const express = require('express');
const connectDB = require('./mongodb');
const authMiddleware = require('./middleware');
const UserModel = require('./UserModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

connectDB();

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// ---------------- LOGIN PAGE ----------------
app.get("/login", async (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

// ---------------- LOGIN API ----------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // ACCESS TOKEN
    const token = jwt.sign(
      { id: user._id },
      "supersecret",
      { expiresIn: "2m" }
    );

    // REFRESH TOKEN
    const refreshToken = jwt.sign(
      { id: user._id },
      "refreshsecret",
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    console.log("Token generated during login:", token);

    res.json({ msg: "Login successful!", token, refreshToken });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------- REFRESH TOKEN ----------------
app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  const user = await UserModel.findOne({ refreshToken });
  if (!user) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, "refreshsecret");

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      "supersecret",
      { expiresIn: "2m" }
    );

    res.json({ token: newAccessToken });

  } catch (error) {
    return res.status(403).json({ error: "Expired or invalid refresh token" });
  }
});

// ---------------- LOGOUT ----------------
app.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  await UserModel.updateOne(
    { refreshToken },
    { $unset: { refreshToken: "" } }
  );

  res.json({ msg: "Logged out!" });
});

// ---------------- SIGNUP ----------------
app.get("/signup", async (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ email, password: hashedPassword });
    await newUser.save();

    res.json({ msg: "Signup successful!" });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ---------------- PROFILE PAGE ----------------
app.get("/profile", (req, res) => {
  res.sendFile(__dirname + "/public/profile.html");
});

// ---------------- PROTECTED API ----------------
app.get("/api/profile", authMiddleware, async (req, res) => {
  res.json({
    msg: "You accessed a protected route!",
    userId: req.user
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
