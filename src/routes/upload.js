// routes/upload.js
const express = require('express');
const uploadRouter = express.Router();
const parser = require('../utils/multer');

uploadRouter.post('/upload', parser.single('image'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'Upload failed' });
  }

  res.json({
    url: req.file.path,
    public_id: req.file.filename,
  });
});

module.exports = uploadRouter;
