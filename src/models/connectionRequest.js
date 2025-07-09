const mongoose = require('mongoose');

// 📦 Define schema for storing connection requests between users
const connectionRequestSchema = new mongoose.Schema({
  // ✅ The sender of the connection request (referencing User collection)
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",              // Refers to the 'User' model
    required: true,           // Cannot be null
  },

  // ✅ The recipient of the connection request (referencing User collection)
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",              // Refers to the 'User' model
    required: true,           // Cannot be null
  },

  // ✅ Status of the connection request (controlled with enum)
  status: {
    type: String,
    required: true,
    enum: {
      values: ["ignore", "interested", "accepted", "rejected"], // Allowed values only
      message: `{VALUE} is not a valid status`                  // Custom error message
    }
  }
}, {
  timestamps: true // 🕒 Automatically adds createdAt and updatedAt fields
});

// 🔒 Middleware: Prevent a user from sending a connection request to themselves
connectionRequestSchema.pre("save", function (next) {
  const request = this; // 'this' is the current document about to be saved

  // Check if sender and receiver are the same
  if (request.fromUserId.equals(request.toUserId)) {
    throw new Error("Cannot send a connection request to yourself!");
  }

  next(); // Proceed with saving
});

// 🔐 Compound Index: Ensure a user cannot send multiple requests to the same user
connectionRequestSchema.index(
  { fromUserId: 1, toUserId: 1 },
  { unique: true } // Prevent duplicates from same sender → receiver
);

// ✅ Create and export the model
const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);
module.exports = ConnectionRequest;
