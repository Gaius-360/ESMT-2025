const express = require("express");
const router = express.Router();
const Paiement = require("../models/Paiement");
const User = require("../models/User");
const requireDaf = require("../middlewares/requireDaf");
const requireEtudiant = require("../middlewares/requireEtudiant");

// Montants par niveau
const MONTANTS_PAR_NIVEAU = {
  "Licence 1": [305000, 100000, 100000, 100000],
  "Licence 2": [305000, 100000, 100000, 100000],
  "Licence 3 - RT": [405000, 100000, 100000, 100000],
  "Licence 3 - ASR": [405000, 100000, 100000, 100000],
};

// ✅ Route pour récupérer les paiements de l’étudiant connecté (via cookie)
router.get("/me", requireEtudiant, async (req, res) => {
  try {
    const etudiantId = req.etudiantId; // vient du middleware

    if (!etudiantId) {
      return res.status(401).json({ message: "Non autorisé (aucun étudiant connecté)." });
    }

    const paiements = await Paiement.find({ etudiant: etudiantId })
      .populate("etudiant", "fullname email niveau")
      .lean();

    if (!paiements || paiements.length === 0) {
      return res.status(404).json({ message: "Aucune situation de paiement trouvée." });
    }

    // Calcul des totaux et du reste à payer
    const paiementsAvecTotaux = paiements.map(p => {
      const totalPaye = p.versements
        ?.filter(v => v.status === "payé")
        ?.reduce((a, v) => a + v.montant, 0) || 0;

      const totalGlobal = p.versements?.reduce((a, v) => a + v.montant, 0) || 0;
      const resteAPayer = totalGlobal - totalPaye;

      return {
        ...p,
        totalPaye,
        resteAPayer
      };
    });

    res.json(paiementsAvecTotaux);
  } catch (err) {
    console.error("Erreur route /api/paiements/me :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// ✅ Récupération de toutes les situations
router.get("/all", requireDaf, async (req, res) => {
  try {
    const paiements = await Paiement.find()
      .populate("etudiant", "fullname email niveau")
      .lean();
    res.json(paiements);
  } catch (err) {
    console.error("GET /all :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Création d’une situation
router.post("/create/:etudiantId", requireDaf, async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const { niveau, anneeAcademique } = req.body;

    if (!niveau || !anneeAcademique)
      return res.status(400).json({ message: "Niveau et année obligatoires." });

    const etu = await User.findById(etudiantId);
    if (!etu) return res.status(404).json({ message: "Étudiant introuvable." });

    const exist = await Paiement.findOne({ etudiant: etudiantId, anneeAcademique });
    if (exist)
      return res.status(400).json({ message: "Situation déjà créée pour cette année." });

    const montants = MONTANTS_PAR_NIVEAU[niveau];
    if (!montants)
      return res.status(400).json({ message: `Niveau invalide : ${niveau}` });

    const paiement = new Paiement({
      etudiant: etudiantId,
      niveau,
      anneeAcademique,
      versements: montants.map((m, i) => ({
        numero: i + 1,
        montant: m,
        status: "non payé",
      })),
      totalPaye: 0,
      resteAPayer: montants.reduce((a, b) => a + b, 0),
    });

    await paiement.save();
    res.json({ message: "Situation créée avec succès." });
  } catch (err) {
    console.error("POST /create :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Mise à jour d’une situation
router.patch("/update/:etudiantId", requireDaf, async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const { versements } = req.body;

    const paiement = await Paiement.findOne({ etudiant: etudiantId });
    if (!paiement)
      return res.status(404).json({ message: "Situation introuvable." });

    versements.forEach((v) => {
      const exist = paiement.versements.find((x) => x.numero === v.numero);
      if (exist) {
        exist.status = v.status;
        exist.datePaiement = v.status === "payé" ? new Date() : null;
      }
    });

    paiement.totalPaye = paiement.versements
      .filter((v) => v.status === "payé")
      .reduce((a, v) => a + v.montant, 0);

    paiement.resteAPayer =
      paiement.versements.reduce((a, v) => a + v.montant, 0) -
      paiement.totalPaye;

    await paiement.save();
    res.json({ message: "Situation mise à jour." });
  } catch (err) {
    console.error("PATCH /update :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.patch("/update/:etudiantId", requireDaf, async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const { versements } = req.body;

    const paiement = await Paiement.findOne({ etudiant: etudiantId });
    if (!paiement)
      return res.status(404).json({ message: "Situation introuvable." });

    versements.forEach((v) => {
      const exist = paiement.versements.find((x) => x.numero === v.numero);
      if (exist) {
        exist.status = v.status;
        exist.datePaiement = v.status === "payé"
          ? (v.datePaiement ? new Date(v.datePaiement) : new Date())
          : null;
      }
    });

    paiement.totalPaye = paiement.versements
      .filter((v) => v.status === "payé")
      .reduce((a, v) => a + v.montant, 0);

    paiement.resteAPayer =
      paiement.versements.reduce((a, v) => a + v.montant, 0) - paiement.totalPaye;

    await paiement.save();
    res.json({ message: "Situation mise à jour avec dates enregistrées." });
  } catch (err) {
    console.error("PATCH /update :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// ✅ Statistiques globales
router.get("/stats", requireDaf, async (req, res) => {
  try {
    const paiements = await Paiement.find().lean();
    const stats = {};

    const niveaux = [...new Set(paiements.map((p) => p.niveau))];
    niveaux.forEach((niveau) => {
      const data = paiements.filter((p) => p.niveau === niveau);
      const total = data.length;
      const totalPaye = data.filter((p) => p.resteAPayer === 0).length;
      const partiel = data.filter((p) => p.totalPaye > 0 && p.resteAPayer > 0).length;
      const nonPaye = data.filter((p) => p.totalPaye === 0).length;
      const montantTotal = data.reduce((a, p) => a + (p.totalPaye || 0), 0);
      const montantRestant = data.reduce((a, p) => a + (p.resteAPayer || 0), 0);

      stats[niveau] = {
        total,
        totalPaye,
        partiel,
        nonPaye,
        montantTotal,
        montantRestant,
      };
    });

    res.json(stats);
  } catch (err) {
    console.error("GET /stats :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});




module.exports = router;
