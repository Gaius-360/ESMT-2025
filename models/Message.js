// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel", required: true },
    senderModel: { type: String, enum: ["Admin", "User"], required: true },

    receiver: { type: mongoose.Schema.Types.ObjectId, refPath: "receiverModel", required: true },
    receiverModel: { type: String, enum: ["Admin", "User"], required: true },

    content: { type: String, default: "" },
    type: { type: String, enum: ["text", "file"], default: "text" },
    file: { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
