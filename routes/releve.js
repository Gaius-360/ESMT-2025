const express = require("express");
const router = express.Router();
const ModeleReleve = require("../models/ModeleReleve");
const Note = require("../models/Note");
const User = require("../models/User");
const requireEtudiant = require("../middleware/requireEtudiant");



// GET modèles par niveau & semestre
// --------------------
router.get("/", async (req, res) => {
  const { niveau, semestre } = req.query;
  if (!niveau || !semestre) return res.status(400).json({ message: "niveau et semestre requis" });
  try {
    const models = await ModeleReleve.find({ niveau, semestre }).lean();
    res.json(models);
  } catch (err) {
    console.error("Erreur GET /api/releve", err);
    res.status(500).json({ message: err.message });
  }
});

// --------------------
// GET modèle par ID
// --------------------
router.get("/:id", async (req, res) => {
  try {
    const modele = await ModeleReleve.findById(req.params.id).lean();
    if (!modele) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(modele);
  } catch (err) {
    console.error("Erreur GET /api/releve/:id", err);
    res.status(500).json({ message: err.message });
  }
});

// --------------------
// POST : création modèle (admin seulement)
// --------------------
router.post("/", requireAdmin, async (req, res) => {
  try {
    const newModele = new ModeleReleve(req.body);
    await newModele.save();
    res.status(201).json(newModele);
  } catch (err) {
    console.error("Erreur POST /api/releve", err);
    res.status(500).json({ message: err.message });
  }
});

// --------------------
// PATCH : mise à jour modèle (admin seulement)
// --------------------
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await ModeleReleve.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json(updated);
  } catch (err) {
    console.error("Erreur PATCH /api/releve/:id", err);
    res.status(500).json({ message: err.message });
  }
});

// --------------------
// DELETE : suppression modèle (admin seulement)
// --------------------
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await ModeleReleve.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Modèle non trouvé" });
    res.json({ message: "Modèle supprimé" });
  } catch (err) {
    console.error("Erreur DELETE /api/releve/:id", err);
    res.status(500).json({ message: err.message });
  }
});


function calculMoyenneMatiere(note1, note2) {
  if (note1 != null && note2 != null) return (note1*3/5 + note2*2/5);
  if (note1 != null) return note1*3/5;
  if (note2 != null) return note2*2/5;
  return null;
}

router.get("/etudiant/me", requireEtudiant, async (req, res) => {
  try {
    const { semestre } = req.query;
    if (!semestre) return res.status(400).json({ message: "Paramètre semestre requis." });

    const etudiant = await User.findById(req.etudiantId).select("-password");
    if (!etudiant) return res.status(404).json({ message: "Étudiant non trouvé." });

    const modele = await ModeleReleve.findOne({ niveau: etudiant.level, semestre }).lean();
    if (!modele) return res.status(404).json({ message: "Modèle non trouvé pour ce niveau/semestre." });

    const notes = await Note.find({ etudiantId: etudiant._id }).lean();

    // Construire le relevé complet
    const releve = {
      etudiant: { _id: etudiant._id, fullname: etudiant.fullname, niveau: etudiant.level },
      semestre,
      titreModele: modele.titre || `${modele.niveau} - ${modele.semestre}`,
      domaines: [],
      moyenneSemestre: null
    };

    let totalCoeff = 0, totalProd = 0;

    (modele.domaines || []).forEach(domaine => {
      const domaineObj = { titre: domaine.titre, matieres: [], moyenneDomaine: null, sommeCoeffDomaine: 0, sommeProd: 0 };
      (domaine.matieres || []).forEach(m => {
        const noteDoc = notes.find(n => n.matiere === m.nom && n.semestre === semestre) || {};
        const note1 = noteDoc.note1 ?? null;
        const note2 = noteDoc.note2 ?? null;
        const note3 = noteDoc.note3 ?? null;
        const moyenneMatiere = calculMoyenneMatiere(note1, note2);
        const validation = moyenneMatiere != null ? (moyenneMatiere>=10?"Validé":"Non validé") : "❌";
        domaineObj.matieres.push({ nom: m.nom, coefficient: m.coefficient, note1, note2, note3, moyenne: moyenneMatiere, validation });
        if (moyenneMatiere != null) {
          domaineObj.sommeCoeffDomaine += m.coefficient;
          domaineObj.sommeProd += m.coefficient*moyenneMatiere;
        }
      });
      if(domaineObj.sommeCoeffDomaine>0) domaineObj.moyenneDomaine = domaineObj.sommeProd/domaineObj.sommeCoeffDomaine;
      if(domaineObj.moyenneDomaine!=null){
        totalCoeff += domaineObj.sommeCoeffDomaine;
        totalProd += domaineObj.moyenneDomaine*domaineObj.sommeCoeffDomaine;
      }
      releve.domaines.push(domaineObj);
    });

    releve.moyenneSemestre = totalCoeff>0 ? totalProd/totalCoeff : null;
    res.json(releve);
  } catch(err){
    console.error(err);
    res.status(500).json({ message:"Erreur lors de la génération du relevé." });
  }
});


module.exports = router;
