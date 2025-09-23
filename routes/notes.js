const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const NotifOnlyStudent = require("../models/NotifOnlyStudent");

// Récupérer toutes les notes d’un étudiant
router.get("/:etudiantId", async (req, res) => {
  try {
    const notes = await Note.find({ etudiantId: req.params.etudiantId });
    res.status(200).json(notes);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération des notes." });
  }
});

// GET /api/notes?niveau=Licence 1
router.get('/', async (req, res) => {
  try {
    const { niveau } = req.query;
    if (!niveau) return res.status(400).json({ msg: "Niveau requis" });

    // Populate pour récupérer le fullname de l'étudiant
    const notes = await Note.find({ niveau })
      .populate('etudiantId', 'fullname') // <-- ajoute fullname
      .lean();

    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});


// Ajouter ou mettre à jour une note (PATCH)
router.patch("/", async (req, res) => {
  const {
    etudiantId,
    matiere,
    coefficient,
    niveau,
    semestre,
    note1,
    note2,
  } = req.body;

  if (!etudiantId || !matiere || !semestre) {
    return res.status(400).json({ message: "etudiantId, matiere et semestre sont requis." });
  }

  try {
    let noteDoc = await Note.findOne({ etudiantId, matiere, semestre });

    if (!noteDoc) {
      noteDoc = new Note({ etudiantId, matiere, coefficient, niveau, semestre });
    } else {
      if (coefficient) noteDoc.coefficient = coefficient;
      if (niveau) noteDoc.niveau = niveau;
    }

     noteDoc.note1 = note1 !== undefined ? note1 : noteDoc.note1;
    noteDoc.note2 = note2 !== undefined ? note2 : noteDoc.note2;

    await noteDoc.save();

     // 🔔 Notification en temps réel
    const io = req.app.get("io");
    io.to(etudiantId.toString()).emit("newNotification", {
      type: "note",
      message: `Nouvelle note enregistrée en ${matiere}`,
      createdAt: new Date()
    });

    // 💾 Sauvegarder la notification en base
    await NotifOnlyStudent.create({
      etudiant: etudiantId,
      type: "note",
      message: `Nouvelle note enregistrée en ${matiere}`,
      lien: "../Notes/notes.html"
    });

    res.status(200).json({ message: "Note enregistrée avec succès." });

  } catch (err) {
    console.error("Erreur lors de l’enregistrement de la note:", err);
res.status(500).json({ message: "Erreur lors de l’enregistrement de la note.", error: err.message });  }
});

// Endpoint pour récupérer les 4 dernières notes d’un étudiant
router.get("/:etudiantId/recentes", async (req, res) => {
  try {
    const notes = await Note.find({ etudiantId: req.params.etudiantId })
                            .sort({ updatedAt: -1 }) // les plus récentes en premier
                            .limit(4)
                            .select("matiere coefficient note1 note2 updatedAt");

    // Pour chaque note, on renvoie la dernière note ajoutée (note1, note2)
    const notesRecentes = notes.map(n => {
      let derniereNote = n.note2 ?? n.note1 ?? null;
      return {
        matiere: n.matiere,
        coefficient: n.coefficient,
        note: derniereNote
      };
    });

    res.status(200).json(notesRecentes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération dernières notes" });
  }
});


module.exports = router;
