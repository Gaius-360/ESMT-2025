const express = require("express");
const router = express.Router();
const NotifOnlyStudent = require("../models/NotifOnlyStudent");
const requireEtudiant = require("../middlewares/requireEtudiant");

// Récupérer les notifications d’un étudiant
router.get("/me", requireEtudiant, async (req, res) => {
  try {
    const notifications = await NotifOnlyStudent.find({ etudiant: req.etudiantId })
      .sort({ createdAt: -1 })
      .limit(50); // Limite les dernières 50 notifications
    res.json(notifications);
  } catch (err) {
    console.error("Erreur récupération notifications:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Marquer une notification comme lue
router.patch("/:id/read", requireEtudiant, async (req, res) => {
  try {
    const notif = await NotifOnlyStudent.findOneAndUpdate(
      { _id: req.params.id, etudiant: req.etudiantId },
      { isRead: true },
      { new: true }
    );

    if (!notif) return res.status(404).json({ message: "Notification introuvable" });

    res.json({ success: true, lien: notif.lien });
  } catch (err) {
    console.error("Erreur notif read:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Supprimer une notification spécifique après lecture
router.delete("/:id", requireEtudiant, async (req, res) => {
  try {
    const notif = await NotifOnlyStudent.findOneAndDelete({
      _id: req.params.id,
      etudiant: req.etudiantId
    });

    if (!notif) return res.status(404).json({ message: "Notification introuvable" });

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression notif:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
