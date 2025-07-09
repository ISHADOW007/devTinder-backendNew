const express = require("express");

const communityRouter = express.Router();
const { userAuth } = require("../middlewares/auth");







const Community = require("../models/community"); // Your Mongoose User model



communityRouter.post("/communities",userAuth, async (req, res) => {
  const { name, description } = req.body;
  const creatorId = req.user._id; // from auth middleware

  const community = await Community.create({
    name,
    description,
    creator: creatorId,
    members: [creatorId],
    admins: [creatorId],
  });
  community.save()
  res.status(201).json(community);
});

 communityRouter.get("/userCommunity",userAuth,async (req, res) => {
    const userId=req.user._id;
   const communities = await Community.find({creator:userId}).populate("creator", "username");
   res.json(communities);
 });

 communityRouter.get("/allCommunityList", async (req, res) => {
   const communities = await Community.find({}).populate("creator", "username");
   res.json(communities);
 });

// router.post("/:id/join", async (req, res) => {
//   const userId = req.user;
//   const community = await Community.findById(req.params.id);
//   if (!community) return res.status(404).json({ error: "Not found" });

//   if (!community.members.includes(userId)) {
//     community.members.push(userId);
//     await community.save();
//   }

//   res.json({ joined: true });
// });

















// Request to join community
communityRouter.post("/communities/:id/request-to-join",userAuth, async (req, res) => {
  const userId = req.user._id;
  const community = await Community.findById(req.params.id);
  if (!community) return res.status(404).json({ error: "Community not found" });

  const existingRequest = community.joinRequests.find(r => r.user.toString() === userId);
  if (existingRequest) return res.status(400).json({ error: "Already requested" });

  community.joinRequests.push({ user: userId ,status:"pending"});
  console.log( community.joinRequests)
  
  await community.save();

  // Notify admins
  // req.app.get("io").to(`admin-${community._id}`).emit("new-join-request", {
  //   communityId: community._id,
  //   userId,
  // });

  res.json({ success: true, message: "Request sent" });
});

// Get all join requests (admin only)
communityRouter.get("/:id/allJoin-requests-forCreator", async (req, res) => {
  const community = await Community.findById(req.params.id).populate("joinRequests.user", "username email");

  const isAdmin = community.creator.equals(req.user._id) || community.admins.includes(req.user._id);
  if (!isAdmin) return res.status(403).json({ error: "Not authorized" });

  res.json(community.joinRequests);
});

// Accept/Reject a request
communityRouter.post("/:id/handle-request", async (req, res) => {
  const { userId, action } = req.body;
  const community = await Community.findById(req.params.id);

  const isAdmin = community.creator.equals(req.user) || community.admins.includes(req.user);
  if (!isAdmin) return res.status(403).json({ error: "Not authorized" });

  const request = community.joinRequests.find(r => r.user.toString() === userId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "pending") return res.status(400).json({ error: "Request already handled" });

  request.status = action === "accept" ? "accepted" : "rejected";
  if (action === "accept") community.members.push(userId);

  await community.save();
  res.json({ success: true, message: `Request ${action}ed` });
});




module.exports = communityRouter;
