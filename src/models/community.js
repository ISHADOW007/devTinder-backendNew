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

// Add in your Mongoose schema file (e.g., Community.js)
communitySchema.index({ name: "text" }); // for search
communitySchema.index({ creator: 1 });    // for filtering by creator

communitySchema.index({ isPublic: 1 });   // for filtering public/private



module.exports = mongoose.model("Community", communitySchema);
