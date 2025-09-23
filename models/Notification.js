// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // destinataire (étudiant)
  sender: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel" },
  senderModel: { type: String, enum: ["Admin", "User"] },
  message: { type: String, required: true },
  type: { type: String, enum: ["message", "absence", "note", "autre"], default: "message" },
  isRead: { type: Boolean, default: false },
    forAdmin: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
