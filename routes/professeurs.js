const express = require("express");
const router = express.Router();
const Professeurs = require("../models/Professeurs");
const authProfesseur = require("../middlewares/authProfesseur"); // middleware d'authentification

// 📌 Inscription professeur
router.post("/register", async (req, res) => {
  try {
    const { email, motDePasse, confirmMotDePasse } = req.body;

    // Vérif champs
    if (!email || !motDePasse || !confirmMotDePasse) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Vérif correspondance mdp
    if (motDePasse !== confirmMotDePasse) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
    }

    // Vérif si email déjà pris
    const exist = await Professeurs.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Création et sauvegarde
    const professeur = new Professeurs({ email, motDePasse });
    await professeur.save();

    res.status(201).json({ message: "Inscription réussie", professeur });
  } catch (error) {
    console.error("Erreur inscription professeur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 📌 Connexion professeur
router.post("/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    // Vérifier si professeur existe
    const professeur = await Professeurs.findOne({ email });
    if (!professeur) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier mot de passe
    const isMatch = await professeur.comparePassword(motDePasse);
    if (!isMatch) {
      return res.status(400).json({ message: "Email ou mot de passe incorrect" });
    }

    // Stocker ID en session
    req.session.professeurId = professeur._id;

    res.json({
      message: "Connexion réussie",
      professeur: {
        id: professeur._id,
        email: professeur.email
      }
    });
  } catch (error) {
    console.error("Erreur login professeur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 📌 Déconnexion professeur
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Déconnexion réussie" });
  });
});

// 📌 Vérifier si connecté (protégé par middleware)
router.get("/me", authProfesseur, async (req, res) => {
  try {
    const professeur = await Professeurs.findById(req.professeurId).select("-motDePasse");
    if (!professeur) {
      return res.status(404).json({ message: "Professeur non trouvé" });
    }
    res.json(professeur);
  } catch (error) {
    console.error("Erreur récupération profil professeur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
