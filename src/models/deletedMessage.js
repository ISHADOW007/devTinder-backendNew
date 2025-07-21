const mongoose = require("mongoose");

const deletedMessageSchema = new mongoose.Schema({
  originalId: String,
  deletedBy: String,
  content: String,
  fileUrl: String,
  createdAt: Date,
});

const DeletedMessage = mongoose.model("DeletedMessage", deletedMessageSchema);

module.exports = DeletedMessage;
