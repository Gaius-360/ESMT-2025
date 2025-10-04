const mongoose = require("mongoose");

const AbsenceSchema = new mongoose.Schema(
  {
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    niveau: { type: String, required: true },         
    semestre: { type: String, enum: ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4", "Semestre 5", "Semestre 6"], required: true },
    dateAbsence: { type: Date, required: true },
    heureDebut: { type: String, required: true },    
    heureFin: { type: String, required: true },      
    duree: { type: Number, default: 0 },            
    statut: { type: String, enum: ["justifié", "non justifié"], default: "non justifié" },
    dateJustification: { type: Date, default: null },
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: "Matiere", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Absence", AbsenceSchema);
