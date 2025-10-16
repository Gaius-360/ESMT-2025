// models/Paiement.js
const mongoose = require("mongoose");

const versementSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  montant: { type: Number, required: true },
  status: { type: String, enum: ["payé", "non payé"], default: "non payé" },
  datePaiement: Date
});

const paiementSchema = new mongoose.Schema({
  etudiant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  niveau: { type: String, required: true },
  anneeAcademique: { type: String, required: true },
  versements: [versementSchema],
  totalPaye: { type: Number, default: 0 },
  resteAPayer: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Paiement", paiementSchema);
