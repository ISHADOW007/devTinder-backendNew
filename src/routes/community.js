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

 communityRouter.get("/userCommunity", async (req, res) => {
   const communities = await Community.find({}).populate("creator", "username");
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

module.exports = communityRouter;
