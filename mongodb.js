const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://dbUser:aaa333@cluster0.l8lbxkx.mongodb.net/UserDB");
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
};

module.exports = connectDB;