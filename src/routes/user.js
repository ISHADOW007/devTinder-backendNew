const express = require('express');
const { userAuth } = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');

const userRouter = express.Router();
const User = require("../models/user"); // Your Mongoose User model



// 📥 Route: Get all pending connection requests received by the user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    })
    .limit(28)
    .populate("fromUserId", "firstName lastName photoUrl age gender about skills");

    res.status(200).json({
      message: "Pending connection requests received",
      data: connectionRequests,
    });

  } catch (error) {
    res.status(400).send("ERROR: " + error.message);
  }
});


// 🔗 Route: Get all accepted connections for the logged-in user
// 📥 Get all accepted connection requests for the logged-in user
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // ✅ Find all requests where the user is either sender or receiver and the status is "accepted"
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
    // 🔄 Populate both sender and receiver so we can return the correct "connected user"
    .populate("fromUserId", "firstName lastName photoUrl age gender about skills")
    .populate("toUserId", "firstName lastName photoUrl age gender about skills");

    // ✅ Extract the connected user info excluding the logged-in user
    const connections = connectionRequests.map((request) => {
      // If logged-in user is the sender, return the receiver's info
      if (request.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return request.toUserId;
      }
      // Otherwise, return the sender's info
      return request.fromUserId;
    });

    // 📤 Send response
    res.status(200).json({
      message: "Accepted connections retrieved successfully.",
      data: connections,
    });

  } catch (error) {
    res.status(400).send("ERROR: " + error.message);
  }
});


userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // ✅ Step 1: Get all connection requests where the user is involved
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ]
    }).select("fromUserId toUserId");

    // ✅ Step 2: Collect all user IDs to hide from feed
    const hideUsersFromFeed = new Set();

    // ➕ Add sender and receiver of each request
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    // ➕ Add logged-in user's own ID
    hideUsersFromFeed.add(loggedInUser._id.toString());

    // ✅ Step 3: Query for users NOT in hide list
    const users = await User.find({
      _id: { $nin: Array.from(hideUsersFromFeed) },
    }).select("-password"); // 👈 Optional: exclude sensitive fields

    // ✅ Step 4: Send response
    res.status(200).json({
      message: "Users feed fetched successfully",
      data: users
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


module.exports = userRouter;
