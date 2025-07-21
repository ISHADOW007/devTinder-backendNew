const express = require("express");

const communityRouter = express.Router();
const { userAuth } = require("../middlewares/auth");







const Community = require("../models/community"); // Your Mongoose User model
const { CommunityMessage } = require("../models/communityChat");


// GET /communities/:id - Get a community by ID




communityRouter.post("/communities",userAuth, async (req, res) => {
  const { name, description ,isPublic} = req.body;
  const creatorId = req.user._id; // from auth middleware
  console.log(isPublic)

  const community = await Community.create({
    name,
    description,
    creator: creatorId,
    members: [creatorId],
    admins: [creatorId],
    isPublic
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
  try {
    const { search = "", page = 1, limit = 10, isPublic } = req.query;

    const query = {
      name: { $regex: search, $options: "i" },
    };

    if (isPublic !== undefined) {
      query.isPublic = isPublic === "true"; // filter by boolean
    }

    const total = await Community.countDocuments(query);

    const communities = await Community.find(query)
      .populate("creator", "firstName lastName emailId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      data: communities,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching communities:", err);
    res.status(500).json({ error: "Server Error" });
  }
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

// routes/communityRoutes.js or similar
communityRouter.post('/:id/join-direct', userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const community = await Community.findById(req.params.id);

    if (!community) return res.status(404).json({ error: 'Community not found' });

    if (!community.isPublic) {
      return res.status(403).json({ error: 'Cannot auto-join private community' });
    }

    // Already a member
    if (community.members.includes(userId)) {
      return res.status(200).json({ message: 'Already a member' });
    }

    // Add user to members
    community.members.push(userId);

    // Optionally make user admin of public community
    // community.admins.push(userId);

    await community.save();

    res.status(200).json({ message: 'Joined community successfully' });
  } catch (err) {
    console.error('Join Direct Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
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
      .populate("members", "firstName lastName emailId isOnline lastSeen")
      .populate("admins", "firstName lastName emailId isOnline lastSeen")
      .populate("creator", "firstName lastName emailId isOnline lastSeen");

    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    res.json(community); // ✅ Includes full data: members, admins, creator
  } catch (err) {
    
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




// DELETE community by ID (only creator or admin allowed ideally)
communityRouter.delete("/community/:id", userAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const community = await Community.findById(id);
    if (!community) return res.status(404).json({ error: "Community not found" });

    if (!community.creator.equals(userId)) {
      return res.status(403).json({ error: "Only the creator can delete the community." });
    }

    await Community.findOneAndDelete({ _id: id }); // ✅ triggers middleware
    res.status(200).json({ message: "Community and its messages deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete community" });
  }
});



// DELETE /user/communities
communityRouter.delete("/user/communities", userAuth, async (req, res) => {
  try {
    const communities = await Community.find({ creator: req.user._id });

    if (communities.length === 0) {
      return res.status(404).json({ message: "No communities to delete." });
    }

    const communityIds = communities.map((c) => c._id);

    // Delete all related messages
    await CommunityMessage.deleteMany({ community: { $in: communityIds } });

    // Delete the communities
    await Community.deleteMany({ _id: { $in: communityIds } });

    res.status(200).json({ message: "All your communities and messages deleted successfully." });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: "Failed to delete communities." });
  }
});










module.exports = communityRouter;
