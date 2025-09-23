const express = require("express");
const router = express.Router();
const Paiement = require("../models/Paiement");

// GET - Récupérer tous les paiements
router.get("/", async (req, res) => {
  try {
    const paiements = await Paiement.find().sort({ datePaiement: -1 });
    res.json(paiements);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// POST - Ajouter un nouveau paiement
router.post("/", async (req, res) => {
  try {
    const { nom, matricule, montant, datePaiement } = req.body;
    const newPaiement = new Paiement({ nom, matricule, montant, datePaiement });
    await newPaiement.save();
    res.status(201).json(newPaiement);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// PUT - Modifier un paiement par ID
router.put("/:id", async (req, res) => {
  try {
    const { nom, matricule, montant, datePaiement } = req.body;
    const updatedPaiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      { nom, matricule, montant, datePaiement },
      { new: true }
    );
    res.json(updatedPaiement);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// DELETE - Supprimer un paiement par ID
router.delete("/:id", async (req, res) => {
  try {
    await Paiement.findByIdAndDelete(req.params.id);
    res.json({ message: "Paiement supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

module.exports = router;
