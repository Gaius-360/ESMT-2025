const mongoose = require("mongoose");

const matiereSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  coefficient: { type: Number, required: true },
  niveau: { 
    type: String, 
    enum: ["Licence 1", "Licence 2", "Licence 3 - RT", "Licence 3 - ASR"], 
    required: true 
  },
  semestre: { type: String, required: true }
});

// Index unique pour éviter doublons nom+niveau+semestre
matiereSchema.index({ niveau: 1, semestre: 1, nom: 1 }, { unique: true });

module.exports = mongoose.model("Matiere", matiereSchema);
