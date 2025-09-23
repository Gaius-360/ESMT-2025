const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  etudiantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  matiere: { type: String, required: true },
  coefficient: { type: Number, required: true },
  niveau: { type: String, required: true },
  semestre: { type: String, required: true },
  note1: { type: Number },
  note2: { type: Number },
}, { timestamps: true }); 

module.exports = mongoose.model("Note", noteSchema);
