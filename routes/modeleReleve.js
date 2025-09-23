const express = require("express");
const router = express.Router();
const ModeleReleve = require("../models/ModeleReleve");
const Note = require("../models/Note");
const User = require("../models/User");
const requireEtudiant = require("../middlewares/requireEtudiant");
const requireAdmin = require("../middlewares/requireAdmin");

// Calcul moyenne matière (3/5 CC + 2/5 semestriel)
function calculMoyenneMatiere(note1, note2) {
  if (note1 == null && note2 == null) return null;
  if (note1 != null && note2 != null) return note1 * 3/5 + note2 * 2/5;
  if (note1 != null) return note1 * 3/5;
  return note2 * 2/5;
}

// GET /api/releve/etudiant/me?semestre=Semestre%201
router.get("/etudiant/me", requireEtudiant, async (req, res) => {
  try {
    const { semestre } = req.query;
    if (!semestre) return res.status(400).json({ message: "Paramètre semestre requis." });

    const etudiantId = req.etudiantId;
    const user = await User.findById(etudiantId).select("-password");
    if (!user) return res.status(404).json({ message: "Étudiant non trouvé." });

    const niveau = user.level;

    // 1) Récupérer le modèle admin pour le niveau + semestre
    const modele = await ModeleReleve.findOne({ niveau, semestre }).lean();
    if (!modele) return res.status(404).json({ message: "Modèle de relevé non trouvé." });

    // 2) Récupérer toutes les notes de l’étudiant
    const notes = await Note.find({ etudiantId }).lean();

    // 3) Construire le relevé dynamique
    const releve = {
      etudiant: { _id: user._id, fullname: user.fullname, niveau: user.level },
      titreModele: modele.titre || `${niveau} - ${semestre}`,
      semestre,
      moyenneSemestre: null,
      domaines: []
    };

    let totalSommeCoeffSemestre = 0;
    let totalSommeProduitMoyennesCoeffsSemestre = 0;

    for (const domaine of modele.domaines || []) {
      const domaineObj = { titre: domaine.titre, matieres: [], sommeCoeffDomaine: 0, sommeProdMoyennesCoeffs: 0, moyenneDomaine: null };

      for (const m of domaine.matieres || []) {
        const noteDoc = notes.find(n => n.matiere === m.nom && n.semestre === semestre);
        const note1 = noteDoc?.note1 ?? null;
        const note2 = noteDoc?.note2 ?? null;
        const note3 = noteDoc?.note3 ?? null;
        const moyenneMatiere = calculMoyenneMatiere(note1, note2);
        const validation = moyenneMatiere != null ? (moyenneMatiere >= 10 ? "Validé" : "Non validé") : "❌";

        domaineObj.matieres.push({
          nom: m.nom,
          coefficient: m.coefficient,
          note1,
          note2,
          note3,
          moyenne: moyenneMatiere != null ? Number(moyenneMatiere.toFixed(2)) : null,
          validation
        });

        if (moyenneMatiere != null) {
          const coef = Number(m.coefficient || 1);
          domaineObj.sommeCoeffDomaine += coef;
          domaineObj.sommeProdMoyennesCoeffs += coef * moyenneMatiere;
        }
      }

      if (domaineObj.sommeCoeffDomaine > 0) {
        domaineObj.moyenneDomaine = Number((domaineObj.sommeProdMoyennesCoeffs / domaineObj.sommeCoeffDomaine).toFixed(2));
        totalSommeCoeffSemestre += domaineObj.sommeCoeffDomaine;
        totalSommeProduitMoyennesCoeffsSemestre += domaineObj.moyenneDomaine * domaineObj.sommeCoeffDomaine;
      }

      releve.domaines.push(domaineObj);
    }

    if (totalSommeCoeffSemestre > 0) {
      releve.moyenneSemestre = Number((totalSommeProduitMoyennesCoeffsSemestre / totalSommeCoeffSemestre).toFixed(2));
    }

    res.json(releve);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la génération du relevé." });
  }
});

// Récupérer les modèles admin filtrés par niveau et semestre
router.get("/", async (req, res) => {
  try {
    const { niveau, semestre } = req.query;
    const filtres = {};
    if (niveau) filtres.niveau = niveau;
    if (semestre) filtres.semestre = semestre;

    const modeles = await ModeleReleve.find(filtres).lean();
    res.json(modeles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération modèles." });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const model = await ModeleReleve.findById(req.params.id);
    if (!model) return res.status(404).json({ message: "Modèle non trouvé." });
    res.json(model);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// CREATE (admin only)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { niveau, semestre, titre, domaines } = req.body;
    if (!niveau || !semestre) return res.status(400).json({ message: "niveau et semestre requis." });
    const newModel = new ModeleReleve({ niveau, semestre, titre: titre || "", domaines: domaines || [] });
    await newModel.save();
    res.status(201).json(newModel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la création du modèle." });
  }
});

// UPDATE (admin only)
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    data.updatedAt = Date.now();
    const updated = await ModeleReleve.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ message: "Modèle non trouvé." });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
});

// DELETE (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await ModeleReleve.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Modèle non trouvé." });
    res.json({ message: "Modèle supprimé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
});

module.exports = router;
