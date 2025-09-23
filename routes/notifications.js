const express = require("express");
const Notification = require("../models/Notification");
const requireAdmin = require("../middlewares/requireAdmin");
const requireEtudiant = require("../middlewares/requireEtudiant");
const router = express.Router();

// Récupérer notifications pour un étudiant
router.get("/student", requireEtudiant, async (req, res) => {
  try {
    const notifs = await Notification.find({ user: req.etudiantId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifs);
  } catch (err) {
    console.error("Erreur notifications messages:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer notifications pour un admin
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({ forAdmin: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération notifications admin" });
  }
});

// Marquer comme lues
router.patch("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur maj notification" });
  }
});

// Route pour envoyer un message de l’admin vers un étudiant
router.post("/send", requireAdmin, async (req, res) => {
  const { etudiantId, texte } = req.body;
  if (!etudiantId || !texte) {
    return res.status(400).json({ message: "Étudiant ou texte manquant" });
  }

  try {
    // 1️⃣ Enregistrer le message
    const message = await Message.create({
      admin: req.adminId,
      etudiant: etudiantId,
      texte,
      isRead: false
    });

    // 2️⃣ Créer la notification côté étudiant
    const notif = await NotifOnlyStudent.create({
      etudiant: etudiantId,
      type: "message",
      message: `Nouveau message de l'administrateur`,
      lien: "../Messages/messages.html",
      isRead: false
    });

    // 3️⃣ Émettre l’événement Socket.io vers l’étudiant
    if (req.io) {
      req.io.to(etudiantId).emit("newNotification", {
        _id: notif._id,
        type: notif.type,
        message: notif.message,
        lien: notif.lien,
        isRead: notif.isRead,
        createdAt: notif.createdAt
      });
    }

    res.status(201).json({ success: true, message, notif });
  } catch (err) {
    console.error("Erreur envoi message:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/notifications/:id  -> suppression par l'étudiant de sa notif message
router.delete("/:id", requireEtudiant, async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, user: req.etudiantId });
    if (!notif) return res.status(404).json({ error: "Notification introuvable" });
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression notification:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


module.exports = router;
