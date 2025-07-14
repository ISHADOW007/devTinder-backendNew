const mongoose = require("mongoose");
const { CommunityMessage } = require("./communityChat");

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





// ⛔ Delete all community messages when community is deleted
communitySchema.pre("findOneAndDelete", async function (next) {
  const communityId = this.getQuery()._id;
  try {
    await CommunityMessage.deleteMany({ community: communityId });
    console.log(`🧹 Messages of community ${communityId} deleted`);
    next();
  } catch (err) {
    console.error("❌ Failed to delete messages:", err);
    next(err);
  }
});

module.exports = mongoose.model("Community", communitySchema);


module.exports = mongoose.model("Community", communitySchema);
