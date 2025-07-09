const express = require("express");
const { validateSignUpData } = require("../utils/validation");
const {userAuth}= require("../middlewares/auth")
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const User = require("../models/user"); // Your Mongoose User model


authRouter.post("/signup", async (req, res) => {
  try {
    const { password, lastName, emailId, firstName } = req.body;

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists." });
    }

    // ✅ Validate input
    try {
      validateSignUpData(req); // You should ensure this throws a descriptive error
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    // ✅ Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ Create and save user
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    await user.save();

    // ✅ Generate JWT Token
    const token = user.getJWT(); // No need to await – it's not async

    // ✅ Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // 🔐 Set to true in production (HTTPS)
      sameSite: "lax",
    });

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ✅ Login Route
authRouter.post("/login", async (req, res) => {
  try {
    const { password, emailId } = req.body;

    const user = await User.findOne({ emailId });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = user.validatePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Generate JWT Token
    const token = await user.getJWT();

    console.log(user)

    // ✅ Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
      sameSite: "lax"
    });

    res.send(user);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal Server Error");
  }
});

authRouter.post("/logout", async (req, res) => {
  res.cookie("token", null, {
    httpOnly: true,
    expires: new Date(Date.now()),
    sameSite: "lax"
  });
  res.json({ message: "Logged out successfully" });
});



module.exports = authRouter;
