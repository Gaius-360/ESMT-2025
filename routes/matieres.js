const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Matiere = require("../models/Matiere");
const requireEtudiant= require("../middlewares/requireEtudiant")

// Récupérer matières par niveau et semestre
router.get("/niveau/:niveau/semestre/:semestre", async (req, res) => {
  const { niveau, semestre } = req.params;
  try {
    const matieres = await Matiere.find({ niveau, semestre });
    res.json(matieres);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors du chargement des matières." });
  }
});

// Récupérer matières par niveau (sans filtre semestre)
router.get("/niveau/:niveau", async (req, res) => {
  try {
    const matieres = await Matiere.find({ niveau: req.params.niveau });
    res.status(200).json(matieres);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors du chargement des matières." });
  }
});

router.get("/etudiant/:semestre", requireEtudiant, async (req, res) => {
  try {
    const etudiant = await User.findById(req.etudiantId);
    if (!etudiant) {
      return res.status(404).json({ message: "Étudiant introuvable." });
    }

    // ⚡ Corrigé : utiliser "niveau" au lieu de "level"
    const matieres = await Matiere.find({
      niveau: etudiant.level,  // correspond au champ dans le modèle Matiere
      semestre: req.params.semestre,
    });

    res.json({ etudiant: etudiant.nom, niveau: etudiant.niveau, matieres });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des matières." });
  }
});


// Ajouter une matière
router.post("/", async (req, res) => {
  const { nom, coefficient, niveau, semestre } = req.body;

  if (!nom || !coefficient || !niveau || !semestre) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    const existe = await Matiere.findOne({ nom, niveau, semestre });
    if (existe) {
      return res.status(400).json({ message: "Cette matière existe déjà pour ce niveau et ce semestre." });
    }
    const nouvelleMatiere = new Matiere({ nom, coefficient, niveau, semestre });
    await nouvelleMatiere.save();
    res.status(201).json(nouvelleMatiere);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l’ajout de la matière." });
  }
});

// Modifier une matière
router.patch("/:id", async (req, res) => {
  const { nom, coefficient, semestre } = req.body;

  if (!nom && !coefficient && !semestre) {
    return res.status(400).json({ message: "Aucun champ à modifier fourni." });
  }

  try {
    const updateData = {};
    if (nom) updateData.nom = nom;
    if (coefficient) updateData.coefficient = coefficient;
    if (semestre) updateData.semestre = semestre;

    const updated = await Matiere.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Matière non trouvée." });

    res.status(200).json({ message: "Matière modifiée avec succès.", matiere: updated });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la modification." });
  }
});

// Supprimer une matière
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Matiere.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Matière non trouvée." });
    res.status(200).json({ message: "Matière supprimée." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
});

module.exports = router;
