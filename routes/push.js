const express = require("express");
const router = express.Router();
const PushSubscription = require("../models/PushSubscription");
const requireEtudiant = require("../middlewares/requireEtudiant");


// Enregistrer / mettre à jour abonnement push
router.post("/subscribe", requireEtudiant, async (req, res) => {
try {
const payload = req.body;
const existing = await PushSubscription.findOne({ etudiant: req.etudiantId });
if (existing) {
existing.subscription = payload;
await existing.save();
} else {
await PushSubscription.create({ etudiant: req.etudiantId, subscription: payload });
}
res.status(201).json({ success: true });
} catch (err) {
console.error("Erreur enregistrement push:", err);
res.status(500).json({ message: "Erreur serveur" });
}
});


module.exports = router;