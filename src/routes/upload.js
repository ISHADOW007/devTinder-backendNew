// routes/upload.js
const express = require("express");
const uploadRouter = express.Router();

const { uploadOnCloudinary } = require("../utils/cloudinary");
const { upload } = require("../utils/multer");
const { userAuth } = require("../middlewares/auth"); // Optional auth middleware

const uploadOnCloud = async (req, res) => {
  try {
    const localPath = req.file?.path;
    if (!localPath) return res.status(400).json({ error: "No file found" });

    const uploaded = await uploadOnCloudinary(localPath, "string"); // optional folder
    if (!uploaded) return res.status(500).json({ error: "Upload failed" });

    return res.json({ url: uploaded.secure_url }); // 🔥 SEND URL BACK
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// POST /cloud/upload
uploadRouter.post("/cloud/upload", userAuth, upload.single("uFile"), uploadOnCloud);

module.exports = uploadRouter;
