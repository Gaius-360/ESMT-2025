const mongoose = require("mongoose");

const AbsenceSchema = new mongoose.Schema(
  {
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    niveau: { type: String, required: true },         // ex: "Licence 1"
    semestre: { type: String, enum: ["Semestre 1", "Semestre 2"], required: true },
    dateAbsence: { type: Date, required: true },
    heureDebut: { type: String, required: true },    // "HH:MM"
    heureFin: { type: String, required: true },      // "HH:MM"
    duree: { type: Number, default: 0 },            // durée en heures
    statut: { type: String, enum: ["justifié", "non justifié"], default: "non justifié" },
    dateJustification: { type: Date, default: null },
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: "Matiere", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Absence", AbsenceSchema);
