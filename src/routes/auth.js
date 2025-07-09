const express = require("express");
const { validateSignUpData } = require("../utils/validation");
const {userAuth}= require("../middlewares/auth")
const {genGoogleURL , oauth2Client} =  require("../utils/auth.google.js")
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const User = require("../models/user"); // Your Mongoose User model
const url = require('url');
const { google } = require("googleapis");

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

authRouter.get("/google",genGoogleURL); 

authRouter.get("/auth/google",async (req,res) => {   //  "http://localhost:7777/auth/google"
    console.log(req.session.state); /// session state from google
    console.log(req.query.state); /// session state from google

    // Handle the OAuth 2.0 server response
    let q = url.parse(req.url, true).query;

    if (q.error) { // An error response e.g. error=access_denied
      console.log('Error:' + q.error);
    } else if (q.state !== req.session.state) { //check state value
      console.log('State mismatch. Possible CSRF attack');
      res.end('State mismatch. Possible CSRF attack');
    } else { // Get access and refresh tokens (if access_type is offline)
      let { tokens } = await oauth2Client.getToken(q.code);
      oauth2Client.setCredentials(tokens);

      /** Save credential to the global variable in case access token was refreshed.
        * ACTION ITEM: In a production app, you likely want to save the refresh token
        *              in a secure persistent database instead. */
      console.log("Google Tokens : " ,tokens);
      // console.log("Google oauth2Client : " ,oauth2Client);
      console.log("Success Google Auth :) ");

      oauth2Client.setCredentials({
        access_token: tokens.access_token,     // or use the refresh_token to get new access_token
      });


      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2',
      });

    const userInfo = await oauth2.userinfo.get();
    const {email,name,given_name,family_name,verified_email,picture}=userInfo.data
    console.log(userInfo.data);

    console.log(email,name,given_name,family_name,verified_email,picture);
    

    }
  
  res.
    redirect(process.env.FRONTEND_URL)
});

module.exports = authRouter;
