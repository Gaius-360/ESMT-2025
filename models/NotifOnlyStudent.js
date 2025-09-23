const mongoose = require("mongoose");

const notifOnlyStudentSchema = new mongoose.Schema({
  etudiant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["message", "absence", "note", "emploi", "Info"], default: "Info" },
  message: { type: String, required: true },
  lien: { type: String }, // 🔗 lien vers la page concernée
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("NotifOnlyStudent", notifOnlyStudentSchema);
