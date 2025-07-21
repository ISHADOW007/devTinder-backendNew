const socket = require("socket.io");
const crypto = require("crypto");
const User = require("../models/user");
const { Chat } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");
const { CommunityMessage } = require("../models/communityChat");
const Community = require("../models/community");

// Utility functions
const getSecretRoomId = (userId1, userId2) =>
  crypto.createHash("sha256").update([userId1, userId2].sort().join("$")).digest("hex");
const generateRoomId = (id1, id2) => [id1, id2].sort().join("#");

let queue = [];
const matchRooms = new Map();

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ========== 1️⃣ USER ONLINE TRACKING ==========
    socket.on("registerOnline", async ({ userId }) => {
      socket.userId = userId;
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit("userStatusChanged", {
        userId,
        isOnline: true,
      });
      console.log(`🟢 User ${userId} is online`);
    });

    socket.on("manualDisconnect", async ({ userId }) => {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      socket.broadcast.emit("userStatusChanged", {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });

    // ========== 2️⃣ PRIVATE CHAT ==========
    socket.on("joinChat", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
    });

    socket.on("sendMessage", async ({ userId, targetUserId, firstName, lastName, text }) => {
      const roomId = getSecretRoomId(userId, targetUserId);

      let chat = await Chat.findOne({ participants: { $all: [userId, targetUserId] } });
      if (!chat) {
        chat = new Chat({ participants: [userId, targetUserId], messages: [] });
      }

      chat.messages.push({ senderId: userId, text });
      await chat.save();

      io.to(roomId).emit("messageReceived", { firstName, lastName, text });
    });

    // ========== 3️⃣ COMMUNITY CHAT (TEXT + IMAGE) ==========
    socket.on("joinCommunity", ({ userId, communityId }) => {
      socket.join(`community_${communityId}`);
    });

    socket.on("sendCommunityMessage", async (payload) => {
      const {
        userId,
        communityId,
        firstName,
        lastName,
        text,
        messageType = "text",
        fileUrl,
        fileName,
      } = payload;

      const community = await Community.findById(communityId);
      if (!community || !community.members.includes(userId)) return;

      const newMsg = new CommunityMessage({
        community: communityId,
        sender: userId,
        messageType,
        content: messageType === "text" ? text : undefined,
        fileUrl,
        fileName,
      });

      await newMsg.save();

      io.to(`community_${communityId}`).emit("receiveCommunityMessage", {
        _id: newMsg._id,
        sender: { firstName, lastName, _id: userId },
        messageType,
        content: text,
        fileUrl,
        fileName,
        createdAt: newMsg.createdAt,
      });
    });

    // ====== DELETE COMMUNITY MESSAGE ======
    socket.on("deleteCommunityMessage", async ({ messageId, userId }) => {
      try {
        const message = await CommunityMessage.findById(messageId);
        if (!message) return;

        // Only sender can delete
        if (String(message.sender) !== String(userId)) return;

        const communityId = message.community;

        // Permanently delete from DB
        await CommunityMessage.findByIdAndDelete(messageId);

        // Notify all users in the community
        io.to(`community_${communityId}`).emit("messageDeleted", {
          messageId,
          forEveryone: true,
        });
      } catch (err) {
        console.error("Failed to delete community message:", err.message);
      }
    });

    // ========== 4️⃣ SPEED MATCHING ==========
    socket.on("joinQueue", () => {
      if (queue.includes(socket.id)) return;
      queue.push(socket.id);
      tryMatch();
    });

    const tryMatch = () => {
      while (queue.length >= 2) {
        const user1 = queue.shift();
        const user2 = queue.shift();
        const roomId = generateRoomId(user1, user2);
        matchRooms.set(roomId, [user1, user2]);

        io.sockets.sockets.get(user1)?.join(roomId);
        io.sockets.sockets.get(user2)?.join(roomId);

        io.to(user1).emit("matchFound", { roomId, partnerId: user2 });
        io.to(user2).emit("matchFound", { roomId, partnerId: user1 });

        console.log(`✅ Matched ${user1} with ${user2} in room ${roomId}`);
      }
    };

    socket.on("signal", ({ roomId, data }) => {
      const peers = matchRooms.get(roomId);
      if (!peers) return;
      peers.forEach((peerId) => {
        if (peerId !== socket.id) {
          io.to(peerId).emit("signal", { from: socket.id, data });
        }
      });
    });

    socket.on("leaveMatch", () => cleanUpSpeedMatch(socket.id));

    const cleanUpSpeedMatch = (socketId) => {
      queue = queue.filter((id) => id !== socketId);
      for (const [roomId, users] of matchRooms.entries()) {
        if (users.includes(socketId)) {
          const other = users.find((id) => id !== socketId);
          if (other) io.to(other).emit("partnerLeft");
          matchRooms.delete(roomId);
        }
      }
    };

    // ========== 5️⃣ DISCONNECT ==========
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.broadcast.emit("userStatusChanged", {
          userId: socket.userId,
          isOnline: false,
          lastSeen: new Date(),
        });
        console.log(`🔴 User ${socket.userId} went offline`);
      }
      cleanUpSpeedMatch(socket.id);
    });
  });
};

module.exports = initializeSocket;
