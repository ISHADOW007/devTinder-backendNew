const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["join","pending", "accepted", "rejected"],
    default: "join"
  },
  requestedAt: { type: Date, default: Date.now },
});

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  joinRequests: [joinRequestSchema], // ✅ subdocument
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Community", communitySchema);
