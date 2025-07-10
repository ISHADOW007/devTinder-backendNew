const express = require("express");

const communityRouter = express.Router();
const { userAuth } = require("../middlewares/auth");







const Community = require("../models/community"); // Your Mongoose User model


// GET /communities/:id - Get a community by ID




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
   const communities = await Community.find({}).populate("creator", "firstName lastName emailId");
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

  
  await community.save();

  // Notify admins
  // req.app.get("io").to(`admin-${community._id}`).emit("new-join-request", {
  //   communityId: community._id,
  //   userId,
  // });

  res.json({ success: true, message: "Request sent" });
});

// Get all join requests (admin only)
communityRouter.get("/communities/:id/allJoin-requests-forCreator",userAuth, async (req, res) => {
  const community = await Community.findById(req.params.id).populate("joinRequests.user", "firstName lastName emailId");
  
  const isAdmin = community.creator.equals(req.user._id) || community.admins.includes(req.user._id);
  if (!isAdmin) return res.status(403).json({ error: "Not authorized" });

  res.json(community.joinRequests);
});

communityRouter.post("/communities/:id/handleJoinRequest", userAuth, async (req, res) => {
  const { requestId, status } = req.body;  // <-- changed action to status
  const community = await Community.findById(req.params.id);

  if (!community) return res.status(404).json({ error: "Community not found" });

  const isAdmin = community.creator.equals(req.user._id) || community.admins.includes(req.user._id);
  if (!isAdmin) return res.status(403).json({ error: "Not authorized" });

  // Find request by requestId subdocument _id, not by user id!
  const requestedUser = community.joinRequests.id(requestId);
  if (!requestedUser) return res.status(404).json({ error: "Request not found" });
  if (requestedUser.status !== "pending") return res.status(400).json({ error: "Request already handled" });

  // Set status directly from frontend
  requestedUser.status = status;

  if (status === "accepted") {
    // Prevent duplicates before adding
    if (!community.members.includes(requestedUser.user.toString())) {
      community.members.push(requestedUser.user);
      
    }
  }

  // Instead of using           requestedUser.remove();
community.joinRequests = community.joinRequests.filter((joinReq) => {
  return joinReq._id.toString() !== requestId;
});


  await community.save();
  res.json({ success: true, message: `Request ${status}` });
});


communityRouter.get("/communities/:id/members", userAuth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate("members", "firstName lastName emailId")
      .populate("admins", "firstName lastName emailId")
      .populate("creator", "firstName lastName emailId");

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    res.json(community); // ✅ Includes full data: members, admins, creator
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// PUT /communities/:id/promote
communityRouter.put("/communities/:id/promote", userAuth, async (req, res) => {
  const { userId } = req.body;

  const community = await Community.findById(req.params.id);
  if (!community) return res.status(404).json({ error: "Community not found" });

  const isRequesterAdmin = community.admins.includes(req.user._id);
  const isRequesterCreator = community.creator.toString() === req.user.toString();
  if (!isRequesterAdmin && !isRequesterCreator)
    return res.status(403).json({ error: "Not authorized to promote" });

  if (!community.members.includes(userId))
    return res.status(400).json({ error: "User must be a member before promoting" });

  if (community.admins.includes(userId))
    return res.status(400).json({ error: "User is already an admin" });

  community.admins.push(userId);
  await community.save();

  res.json({ success: true, message: "User promoted to admin" });
});


// PUT /communities/:id/demote
communityRouter.put("/communities/:id/demote", userAuth, async (req, res) => {
  const { userId } = req.body;

  const community = await Community.findById(req.params.id);
  if (!community) return res.status(404).json({ error: "Community not found" });

  const isRequesterAdmin = community.admins.includes(req.user._id);
  const isRequesterCreator = community.creator.toString() === req.user.toString();
  if (!isRequesterAdmin && !isRequesterCreator)
    return res.status(403).json({ error: "Not authorized to demote" });

  if (!community.admins.includes(userId))
    return res.status(400).json({ error: "User is not an admin" });

  if (community.creator.toString() === userId)
    return res.status(400).json({ error: "Cannot demote the creator" });

  community.admins.pull(userId);
  await community.save();

  res.json({ success: true, message: "User demoted to member" });
});


// PUT /communities/:id/remove
communityRouter.put("/communities/:id/remove", userAuth, async (req, res) => {
  const { userId } = req.body;

  const community = await Community.findById(req.params.id);
  if (!community) return res.status(404).json({ error: "Community not found" });

  const isRequesterAdmin = community.admins.includes(req.user._id);
  const isRequesterCreator = community.creator.toString() === req.user.toString();
  if (!isRequesterAdmin && !isRequesterCreator)
    return res.status(403).json({ error: "Not authorized to remove" });

  if (community.creator.toString() === userId)
    return res.status(400).json({ error: "Cannot remove the creator" });

  if (!community.members.includes(userId))
    return res.status(400).json({ error: "User is not a member" });

  community.members.pull(userId); // Remove from members
  community.admins.pull(userId);  // Also remove from admins (if present)

  await community.save();

  res.json({ success: true, message: "User removed from community" });
});





// GET /communities/my
communityRouter.get("/communities/my", userAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Find communities where user is a member or admin
    const communities = await Community.find({
      $or: [
        { members: userId },
        { admins: userId }
      ]
    })
      .populate("creator", "firstName lastName emailId")
      .populate("admins", "firstName lastName emailId")
      .populate("members", "firstName lastName emailId");

      console.log(communities[0].members)

    // Map each community to include user's role
    const result = communities.map((comm) => {
      const isAdmin = comm.admins.some(admin => admin._id.toString() === userId);
      const role = isAdmin ? "Admin" : "Member";
      return {
        _id: comm._id,
        name: comm.name,
        description: comm.description,
        creator: comm.creator,
        role,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});


communityRouter.get("/communities/:id", userAuth, async (req, res) => {
  try {
    const communityId = req.params.id;

    const community = await Community.findById(communityId)
      .populate("creator", "firstName lastName emailId")
      .populate("admins", "firstName lastName emailId")
      .populate("members", "firstName lastName emailId");

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    res.json(community);
  } catch (err) {
    console.error("Error fetching community by ID:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});










module.exports = communityRouter;
