// socket.js
const socket = require("socket.io");
const crypto = require("crypto");
const User = require("../models/user");


const { Chat } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");
const { CommunityMessage } = require("../models/communityChat");
const Community = require("../models/community");

// Utility functions...
const getSecretRoomId = (userId1, userId2) =>
  crypto.createHash("sha256").update([userId1, userId2].sort().join("$")).digest("hex");
const generateRoomId = (id1, id2) => [id1, id2].sort().join("#");

let queue = [];
const matchRooms = new Map();

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // =============== 1️⃣ USER ONLINE TRACKING ==================
    socket.on("registerOnline", async ({ userId }) => {
       console.log("register")
      socket.userId = userId;

      // Mark user online in DB
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Notify others
      socket.broadcast.emit("userStatusChanged", {
        userId,
        isOnline: true,
      });

      console.log(`🟢 User ${userId} is online`);
    });

    // Manual disconnect (on logout)
    socket.on("manualDisconnect", async ({ userId }) => {
      console.log(`🚪 Manual disconnect for ${userId}`);

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

    // =============== 2️⃣ PRIVATE 1-1 CHAT ==================
    socket.on("joinChat", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
    });

    socket.on("sendMessage", async ({ userId, targetUserId, firstName, lastName, text }) => {
      const roomId = getSecretRoomId(userId, targetUserId);

      let chat = await Chat.findOne({
        participants: { $all: [userId, targetUserId] },
      });

      if (!chat) {
        chat = new Chat({ participants: [userId, targetUserId], messages: [] });
      }

      chat.messages.push({ senderId: userId, text });
      await chat.save();

      io.to(roomId).emit("messageReceived", {
        firstName,
        lastName,
        text,
      });
    });

    // =============== 3️⃣ COMMUNITY CHAT ==================
    socket.on("joinCommunity", ({ userId, communityId }) => {
      socket.join(`community_${communityId}`);
    });

    socket.on("sendCommunityMessage", async ({ userId, communityId, firstName, lastName, text }) => {
      const community = await Community.findById(communityId);
      if (!community || !community.members.includes(userId)) return;

      const msg = new CommunityMessage({
        community: communityId,
        sender: userId,
        content: text,
        messageType: "text",
      });
      await msg.save();

      io.to(`community_${communityId}`).emit("receiveCommunityMessage", {
        firstName,
        lastName,
        text,
      });
    });

    // =============== 4️⃣ SPEED MATCHING ==================
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

    // =============== 5️⃣ DISCONNECT ==================
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
