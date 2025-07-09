const express = require("express");

const profileRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");


// ✅ Profile Route
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.send(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
      // return res.status(400).send("")
    }
    const loggedInUser=req.user;
    console.log(loggedInUser)
    Object.keys(req.body).forEach((key)=>loggedInUser[key]=req.body[key])
    console.log(loggedInUser)
     await loggedInUser.save();
    res.send("hii")

  } catch (err) {
    console.error("Profile error:", err);
    res.status(400).send("ERROR :" + err.message);
  }
});

module.exports = profileRouter;
