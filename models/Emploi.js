// models/Emploi.js
const mongoose = require("mongoose");

const EmploiSchema = new mongoose.Schema(
  {
    niveau: {
      type: String,
      enum: ["Licence 1", "Licence 2", "Licence 3 - RT", "Licence 3 - ASR"],
      required: true,
      index: true,
      unique: true, // 1 seul emploi par niveau (le dernier remplace l'ancien)
    },
    data: { type: Buffer, required: true },          // binaire PDF
    contentType: { type: String, default: "application/pdf" },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Emploi", EmploiSchema);
