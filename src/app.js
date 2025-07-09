const express = require("express");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// 🔄 Cron job
require("./utils/cronjob");

// 🧩 Middlewares
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 📦 Routers
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat");
const communityRouter = require("./routes/community");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", chatRouter);
app.use("/",communityRouter)

// ✅ Optional health check
app.get("/", (req, res) => {
  res.send("💡 DevTinder backend is running!");
});

// 🔌 Socket setup
const initializeSocket = require("./utils/socket");

initializeSocket(server);

// 🛢 Start server after DB connects
const PORT = process.env.PORT || 7777;

connectDB()
  .then(() => {
    console.log("Database connection established...");
    server.listen(PORT, () => {
      console.log(`✅ Server is successfully listening on port ${PORT}...`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
