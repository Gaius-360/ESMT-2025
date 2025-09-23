const mongoose = require("mongoose");

const paiementSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  matricule: { type: String, required: true },
  montant: { type: Number, required: true },
  datePaiement: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Paiement", paiementSchema);
