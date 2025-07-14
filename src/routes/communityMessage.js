const express = require("express");
const communityMessageRouter = express.Router();
const { userAuth } = require("../middlewares/auth");

const {CommunityMessage} = require("../models/communityChat");
const Community = require("../models/community");

// GET all messages from a community
communityMessageRouter.get("/community/:communityId", userAuth, async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  try {
    const community = await Community.findById(communityId);
    console.log("community :",community)
    if (!community) return res.status(404).json({ error: "Community not found" });

    const isMember = community.members.some(memberId => memberId.equals(userId));
    if (!isMember)
      return res.status(403).json({ error: "Access denied. Not a member of this community." });

    const messages = await CommunityMessage.find({ community: communityId })
      .sort({ createdAt: 1 })
      .populate("sender", "firstName lastName");
    console.log("CommunityMessage:",messages)

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST a new message to a community
communityMessageRouter.post("/community/:communityId", userAuth, async (req, res) => {
  const { communityId } = req.params;
  const userId = req.user._id;
  const { messageType, content, fileUrl, fileName } = req.body;

  try {
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ error: "Community not found" });

    const isMember = community.members.some(memberId => memberId.equals(userId));
    if (!isMember)
      return res.status(403).json({ error: "You are not a member of this community." });

    const newMessage = new CommunityMessage({
      community: communityId,
      sender: userId,
      messageType,
      content,
      fileUrl,
      fileName,
    });

    await newMessage.save();

    const populatedMessage = await newMessage.populate("sender", "firstName lastName");

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Message sending failed" });
  }
});

module.exports = communityMessageRouter;
