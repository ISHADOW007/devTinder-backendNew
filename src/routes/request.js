const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user"); // User model for verifying receiver exists


// 📌 Route: Send a connection request
// 🔒 Protected by userAuth middleware (only logged-in users can send requests)
// 🛣️ Endpoint: POST /request/send/:status/:toUserId
requestRouter.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
  try {
    // ✅ Get the sender's ID from the authenticated user (via middleware)
    const fromUserId = req.user._id;

    // ✅ Extract receiver user ID and connection request status from route parameters
    const toUserId = req.params.toUserId;
    const status = req.params.status;

    // ✅ Only allow specific request statuses (security check)
    const allowedStatus = ["ignore", "interested"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status type: " + status });
    }

    // 🔍 Ensure receiver user actually exists
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔁 Prevent duplicate requests (check both directions)
    const existingConnectionRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId }
      ]
    });

    // 🚫 If a request already exists, return 409 Conflict
    if (existingConnectionRequest) {
      return res.status(409).json({
        message: "Connection request already exists between these users",
        existingRequest: existingConnectionRequest,
      });
    }

    // ✅ Create a new connection request
    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status,
    });

    // 💾 Save the request to the database
    const data = await connectionRequest.save();

    // ✅ Respond with success
    return res.status(201).json({
      message: req.user.firstName + "is" + status + "in" + toUser.firstName ,
      data,
    });

  } catch (error) {
    // ❌ Catch any unexpected errors
    console.error("Error sending connection request:", error);

    return res.status(500).json({
      error: "Failed to send connection request",
      details: error.message,
    });
  }
});


// ✅ Review a connection request (accept or reject)
//POST /request/review/accepted/<connectionRequest._id>
requestRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
  try {
    // ✅ Get the currently logged-in user from middleware
    const loggedInUser = req.user;

    // ✅ Extract 'status' and 'requestId' from route parameters
    const { status, requestId } = req.params;
    

    // ✅ Only allow these statuses
    const allowedStatus = ["accepted", "rejected"];

    // ❌ If status is invalid, return error
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status not allowed!" });
    }

    // ✅ Find the connection request by ID, receiver ID, and current status
    const connectionRequests = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id, // Only the receiver can respond
      status: "interested"        // Only pending requests can be reviewed
    });

    // ❌ If no such request exists, return 404
    if (!connectionRequests) {
      return res.status(404).json({ message: "Connection Request not Found" });
    }

    // ✅ Update the request's status
    connectionRequests.status = status;

    // ✅ Save the updated document
    const updatedRequest = await connectionRequests.save();

    // ✅ Send success response
    return res.json({
      message: `Connection request ${status}`,
      data: updatedRequest
    });

  } catch (err) {
    // ❌ Catch and send any unexpected errors
    return res.status(400).send('ERROR: ' + err.message);
  }
});


module.exports = requestRouter;
