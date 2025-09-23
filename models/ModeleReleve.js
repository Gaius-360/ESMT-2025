// models/ModeleReleve.js
const mongoose = require("mongoose");

const MatiereSchema = new mongoose.Schema({
  ordre: { type: Number, default: 1 },
  nom: { type: String, required: true },
  coefficient: { type: Number, default: 1 }
}, { _id: false });

const DomaineSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  matieres: { type: [MatiereSchema], default: [] },
  ordre: { type: Number, default: 1 }
}, { _id: false });

const ModeleReleveSchema = new mongoose.Schema({
  niveau: { type: String, required: true },
  semestre: { type: String, required: true }, // ex: "Semestre 1"
  titre: { type: String, default: "" },
  domaines: { type: [DomaineSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("ModeleReleve", ModeleReleveSchema);
