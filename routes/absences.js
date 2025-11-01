const express = require("express");
const router = express.Router();
const Absence = require("../models/Absence");
const User = require("../models/User");
const requireAdmin = require("../middlewares/requireAdmin");
const requireEtudiant = require("../middlewares/requireEtudiant");
const NotifOnlyStudent = require("../models/NotifOnlyStudent");

// -------- Helpers --------
function toDateOnly(d) {
  if (!d) return null;
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function calcDuree(heureDebut, heureFin) {
  if (!heureDebut || !heureFin) return 0;
  const [h1, m1] = heureDebut.split(":").map(Number);
  const [h2, m2] = heureFin.split(":").map(Number);
  const duree = (h2 + m2 / 60) - (h1 + m1 / 60);
  return duree > 0 ? duree : 0;
}

// ---------------- ADMIN ROUTES ----------------

// Liste globale d’un niveau/semestre
router.get("/niveau/:niveau/semestre/:semestre", requireAdmin, async (req, res) => {
  try {
    const { niveau, semestre } = req.params;
    const items = await Absence.find({ niveau, semestre })
      .populate("etudiant", "fullname email")
      .populate("matiere", "nom")
      .sort({ dateAbsence: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération absences (niveau)." });
  }
});

// Liste d’un étudiant (admin)
router.get("/admin/etudiant/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { semestre } = req.query;
    const filtre = { etudiant: id };
    if (semestre) filtre.semestre = semestre;

    const items = await Absence.find(filtre)
      .populate("matiere", "nom")
      .sort({ dateAbsence: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération absences étudiant." });
  }
});

// Création (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { etudiantId, semestre, dateAbsence, heureDebut, heureFin, statut, dateJustification, matiereId } = req.body;
    if (!etudiantId || !semestre || !dateAbsence || !heureDebut || !heureFin || !matiereId) {
      return res.status(400).json({ message: "Champs requis: etudiantId, semestre, dateAbsence, heureDebut, heureFin, matiereId." });
    }

    const user = await User.findById(etudiantId).select("level");
    if (!user) return res.status(404).json({ message: "Étudiant introuvable." });

    const duree = calcDuree(heureDebut, heureFin);

    const item = await Absence.create({
      etudiant: etudiantId,
      niveau: user.level,
      semestre,
      dateAbsence: toDateOnly(dateAbsence),
      heureDebut,
      heureFin,
      duree,
      statut: statut || "non justifié",
      dateJustification: dateJustification ? toDateOnly(dateJustification) : null,
      matiere: matiereId
    });

    // Notification temps réel
    const io = req.app.get("io");
    io.to(etudiantId.toString()).emit("newNotification", {
      type: "absence",
      message: `Nouvelle absence enregistrée le ${item.dateAbsence.toLocaleDateString()}`,
      lien: "../Absences/absences.html",
      createdAt: new Date()
    });

    await NotifOnlyStudent.create({
      etudiant: etudiantId,
      type: "absence",
      message: `Nouvelle absence enregistrée le ${new Date(dateAbsence).toLocaleDateString()}`
    });


    // 🚀 Envoi notification push
    const sendPush = req.app.get('sendPushToEtudiant');
    await sendPush(
      etudiantId,
      '🚨 Nouvelle absence',
      'Une absence a été ajoutée à votre dossier.',
      'https://esmt-2025.onrender.com/Student_Space/connexion/etudiant_connexion.html'
    );
    
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur création absence.", error: err.message });
  }
});

// Modification (admin)
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.dateAbsence) data.dateAbsence = toDateOnly(data.dateAbsence);
    if (data.dateJustification) data.dateJustification = toDateOnly(data.dateJustification);

    if (data.etudiantId) {
      const user = await User.findById(data.etudiantId).select("level");
      if (!user) return res.status(404).json({ message: "Étudiant introuvable." });
      data.etudiant = user._id;
      data.niveau = user.level;
      delete data.etudiantId;
    }

    if (data.matiereId) {
      data.matiere = data.matiereId;
      delete data.matiereId;
    }

    // Recalculer durée si heureDebut ou heureFin changent
    if (data.heureDebut || data.heureFin) {
      const abs = await Absence.findById(id);
      data.heureDebut = data.heureDebut || abs.heureDebut;
      data.heureFin = data.heureFin || abs.heureFin;
      data.duree = calcDuree(data.heureDebut, data.heureFin);
    }

    const updated = await Absence.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ message: "Absence non trouvée." });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur mise à jour absence." });
  }
});

// Suppression (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Absence.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: "Absence non trouvée." });
    res.json({ message: "Absence supprimée." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur suppression absence." });
  }
});

// ---------------- ETUDIANT ROUTES ----------------
router.get("/etudiant/me", requireEtudiant, async (req, res) => {
  try {
    const { semestre } = req.query;
    const filtre = { etudiant: req.etudiantId };
    if (semestre) filtre.semestre = semestre;

    const items = await Absence.find(filtre)
      .populate("matiere", "nom")
      .sort({ dateAbsence: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération de vos absences." });
  }
});

module.exports = router;
