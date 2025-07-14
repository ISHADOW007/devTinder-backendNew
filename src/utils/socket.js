const socket = require("socket.io");
const crypto = require("crypto");

const { Chat } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");
const { CommunityMessage } = require("../models/communityChat");
const Community = require("../models/community");

// 🔐 Generate a unique room ID for private 1-to-1 chat using sorted user IDs
const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

// 🎲 Generate a deterministic room ID for Speed Match
const generateRoomId = (id1, id2) => [id1, id2].sort().join("#");

// 🧩 In-memory queue for Speed Match users
let queue = [];

// 🔗 Map to track rooms and connected socket IDs
const matchRooms = new Map(); // roomId => [socketId1, socketId2]

/**
 * Initialize socket.io and attach event handlers
 */
const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173", // 🔧 Change to your frontend domain in production
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ===================================================
    // 🔐 1. PRIVATE 1-to-1 CHAT HANDLING
    // ===================================================

    // Join a private chat room based on userId + targetUserId
    socket.on("joinChat", ({ firstName, userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      console.log(`${firstName} joined private chat room: ${roomId}`);
      socket.join(roomId);
    });

    // Send a private message and store it in DB
    socket.on("sendMessage", async ({ firstName, lastName, userId, targetUserId, text }) => {
      try {
        const roomId = getSecretRoomId(userId, targetUserId);
        console.log(`${firstName} sent private message: ${text}`);

        let chat = await Chat.findOne({
          participants: { $all: [userId, targetUserId] },
        });

        if (!chat) {
          chat = new Chat({
            participants: [userId, targetUserId],
            messages: [],
          });
        }

        chat.messages.push({ senderId: userId, text });
        await chat.save();

        // Broadcast message to both users in room
        io.to(roomId).emit("messageReceived", {
          firstName,
          lastName,
          text,
        });
      } catch (err) {
        console.error("❌ Error sending private message:", err);
      }
    });

    // ===================================================
    // 🧑‍🤝‍🧑 2. COMMUNITY GROUP CHAT HANDLING
    // ===================================================

    // Join a community room using communityId
    socket.on("joinCommunity", ({ userId, communityId }) => {
      const roomId = `community_${communityId}`;
      console.log(`User ${userId} joined community room: ${roomId}`);
      socket.join(roomId);
    });

    // Send a community message if user is a member
    socket.on("sendCommunityMessage", async ({ firstName, lastName, userId, communityId, text }) => {
      try {
        const community = await Community.findById(communityId);
        if (!community) return;

        const isMember = community.members.includes(userId);
        if (!isMember) return;

        const newMsg = new CommunityMessage({
          community: communityId,
          sender: userId,
          messageType: "text",
          content: text,
        });

        await newMsg.save();

        // Broadcast message to all members in community room
        io.to(`community_${communityId}`).emit("receiveCommunityMessage", {
          firstName,
          lastName,
          text,
        });
      } catch (err) {
        console.error("❌ Error sending community message:", err);
      }
    });

    // ===================================================
    // ⚡ 3. SPEED MATCHING VIDEO CHAT (WebRTC Signaling)
    // ===================================================

    // Add user to SpeedMatch queue
    socket.on("joinQueue", () => {

       if (queue.includes(socket.id)) {
    console.log(`⚠️ ${socket.id} is already in queue`);
    return;
  }
      console.log(`🕐 ${socket.id} joined SpeedMatch queue`);
      queue.push(socket.id);
      tryMatch();
    });

    // Try to match two users from the queue
    function tryMatch() {
      while (queue.length >= 2) {
        const user1 = queue.shift();
        const user2 = queue.shift();

        const roomId = generateRoomId(user1, user2);
        matchRooms.set(roomId, [user1, user2]);

        io.sockets.sockets.get(user1)?.join(roomId);
        io.sockets.sockets.get(user2)?.join(roomId);

        // Notify both users to start call
        io.to(user1).emit("matchFound", { roomId, partnerId: user2 });
        io.to(user2).emit("matchFound", { roomId, partnerId: user1 });

        console.log(`✅ Matched ${user1} & ${user2} in room: ${roomId}`);
      }
    }

    // WebRTC Signaling (offer/answer/ICE candidate)
    socket.on("signal", ({ roomId, data }) => {
      const peers = matchRooms.get(roomId);
      if (!peers) return;

      // Send signaling data to the other user
      peers.forEach((peerId) => {
        if (peerId !== socket.id) {
          io.to(peerId).emit("signal", { from: socket.id, data });
        }
      });
    });

    // User manually leaves SpeedMatch
    socket.on("leaveMatch", () => {
      console.log(`🚪 ${socket.id} left SpeedMatch`);
      cleanUpSpeedMatch(socket.id);
    });

    // Remove user from queue or active match room
    const cleanUpSpeedMatch = (socketId) => {
      // Remove from queue if still waiting
      queue = queue.filter((id) => id !== socketId);

      // If already in a room, notify the other user
      for (const [roomId, users] of matchRooms.entries()) {
        if (users.includes(socketId)) {
          const otherUser = users.find((id) => id !== socketId);
          if (otherUser) {
            io.to(otherUser).emit("partnerLeft");
          }
          matchRooms.delete(roomId);
        }
      }
    };

    // ===================================================
    // 🛑 ON DISCONNECT
    // ===================================================

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      cleanUpSpeedMatch(socket.id);
    });
  });
};

module.exports = initializeSocket;
