// routes/emplois.js
const express = require("express");
const multer = require("multer");
const Emploi = require("../models/Emploi");
const NotifOnlyStudent = require("../models/NotifOnlyStudent");
const User = require("../models/User");
const router = express.Router();

// Utilise la mémoire (pas de fichiers temporaires sur disque)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Seuls les fichiers PDF sont autorisés."));
    }
    cb(null, true);
  },
});

/**
 * POST /api/emplois/import
 * Champs requis: nom, niveau, file (PDF)
 * Remplace l'emploi existant pour ce niveau (1 seul PDF par niveau)
 */
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const { niveau } = req.body;

    if (!niveau) {
      return res.status(400).json({ message: "Nom et niveau sont requis." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier PDF reçu." });
    }

    // supprime l'ancien emploi de ce niveau (on garde le dernier)
    await Emploi.deleteMany({ niveau });

    const emploi = await Emploi.create({

      niveau,
      data: req.file.buffer,
      contentType: req.file.mimetype || "application/pdf",
      size: req.file.size,
    });

    // Récupérer tous les étudiants du niveau
const etudiants = await User.find({ level: niveau }).select("_id");

for (const etu of etudiants) {
  // 🔔 Temps réel via Socket.IO
  const io = req.app.get("io");
  io.to(etu._id.toString()).emit("newNotification", {
    type: "emploi",
    message: `Nouvel emploi du temps disponible`,
    createdAt: new Date()
  });

  // 💾 Sauvegarde en base
  await NotifOnlyStudent.create({
    etudiant: etu._id,
    type: "emploi",
    message: `Nouvel emploi du temps disponible`,
    lien: "../Calendrier/calendrier.html"
  });
}


 // 🚀 Envoi notification push
  const sendPush = req.app.get('sendPushToEtudiant');
  await sendPush(
    etu._id,
    '🗓️ Emploi du temps mis à jour',
    'Votre emploi du temps a été modifié.',
    'https://esmt-2025.onrender.com/Student_Space/connexion/etudiant_connexion.html'
  );


    return res.json({
      message: "PDF importé avec succès ✅",
      emploi: {
        id: emploi._id,
        niveau: emploi.niveau,
        size: emploi.size,
        uploadedAt: emploi.uploadedAt,
      },
    });
  } catch (err) {
    console.error("Erreur import PDF:", err);
    return res.status(500).json({ message: "Erreur serveur lors de l'import." });
  }
});

/**
 * GET /api/emplois/pdf/:niveau
 * Renvoie le PDF binaire tel qu'uploadé.
 */
router.get("/pdf/:niveau", async (req, res) => {
  try {
    const { niveau } = req.params;
    const emploi = await Emploi.findOne({ niveau });

    if (!emploi) {
      return res.status(404).json({ message: "Aucun emploi trouvé pour ce niveau." });
    }

    res.setHeader("Content-Type", emploi.contentType || "application/pdf");
    // inline -> affichage dans le navigateur / iframe
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(Emploi.pdf)}"`
    );
    return res.send(emploi.data);
  } catch (err) {
    console.error("Erreur récupération PDF:", err);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération du PDF." });
  }
});

// routes/emplois.js (ajouter à la fin)
router.get("/", async (req, res) => {
  try {
    const { niveau } = req.query;
    let query = {};
    if (niveau) query.niveau = niveau;

    const emplois = await Emploi.find(query)
      .sort({ uploadedAt: -1 }) // plus récent en premier
      .select("niveau uploadedAt nom");

    return res.json(emplois);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


module.exports = router;
