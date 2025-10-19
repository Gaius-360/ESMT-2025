// routes/etudiants.js
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();
const requireEtudiant = require("../middlewares/requireEtudiant");
const Absence = require("../models/Absence");
const requireAdmin = require("../middlewares/requireAdmin");
const requireDaf = require("../middlewares/requireDaf");

// ✅ Inscription étudiant
router.post("/register", async (req, res) => {
  const { fullname, email, password, phone, gender, birthdate, level } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email déjà utilisé." });

    const newUser = new User({ fullname, email, password, phone, gender, birthdate, level });
    await newUser.save();

    res.status(201).json({ message: "Inscription réussie." });
  } catch (err) {
    console.error("Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Connexion étudiant (version sécurisée)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🧹 Supprime tout ancien cookie
    res.clearCookie("etudiantId");

    // 🔍 Vérifie si l'utilisateur existe et est bien un étudiant actif
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe invalide." });
    }

    // Si tu veux renforcer : ne permettre que les utilisateurs ayant un rôle précis
    if (user.role && user.role.toLowerCase() !== "etudiant") {
      return res.status(403).json({ message: "Accès réservé aux étudiants." });
    }

    // 🔑 Vérifie le mot de passe
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou mot de passe invalide." });
    }

    // ✅ Crée un nouveau cookie sécurisé
    res.cookie("etudiantId", user._id.toString(), {
      httpOnly: true,
      sameSite: "Lax",
      secure: false, // ✅ passe à true en HTTPS
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });

    res.status(200).json({
      message: "Connexion réussie.",
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        level: user.level,
      },
    });
  } catch (err) {
    console.error("Erreur login étudiant :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Supprimer définitivement un étudiant
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }
    res.json({ message: "Étudiant supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression étudiant :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ✅ Vérification session étudiant (sécurisée)
router.get("/check", async (req, res) => {
  const { etudiantId } = req.cookies;

  // Aucun cookie → non connecté
  if (!etudiantId) {
    return res.json({ connected: false });
  }

  try {
    // Vérifie si l'étudiant existe dans la base
    const user = await User.findById(etudiantId).select("-password");

    if (!user) {
      // 🧹 Supprime le cookie invalide s'il n'existe plus
      res.clearCookie("etudiantId");
      return res.json({ connected: false });
    }

    // ✅ Étudiant valide
    res.json({ connected: true, user });
  } catch (err) {
    console.error("Erreur /check :", err);
    res.status(500).json({ connected: false, message: "Erreur serveur." });
  }
});


// ⚠️ /me AVANT /:niveau
router.get("/me", requireEtudiant, async (req, res) => {
  try {
    const student = await User.findById(req.etudiantId).select("-password");
    if (!student) return res.status(404).json({ error: "Étudiant non trouvé" });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/profil", requireEtudiant, async (req, res) => {
  try {
    const user = await User.findById(req.etudiantId).select("-password");
    if (!user) return res.status(404).json({ message: "Étudiant non trouvé" });
    res.json(user);
  } catch (err) {
    console.error("Erreur profil:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.patch("/profil", requireEtudiant, async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const user = await User.findById(req.etudiantId);
    if (!user) return res.status(404).json({ message: "Étudiant non trouvé" });

    if (typeof email === "string" && email.trim()) user.email = email.trim();
    if (typeof phone === "string") user.phone = phone.trim();

    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: "Profil mis à jour avec succès" });
  } catch (err) {
    console.error("Erreur mise à jour profil:", err);
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/absences/me/recentes", requireEtudiant, async (req, res) => {
  try {
    const absences = await Absence.find({ etudiant: req.etudiantId })
      .sort({ dateAbsence: -1 })
      .limit(4)
      .lean();
    res.json(absences);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération des dernières absences." });
  }
});

// 🔎 Recherche étudiant
router.get("/search", requireAdmin, async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.json([]); // si input vide → tableau vide
    }

    const students = await User.find({
      role: "Etudiant",
      fullname: { $regex: query, $options: "i" } // recherche insensible à la casse
    }).select("_id fullname level email");

    res.json(students);
  } catch (err) {
    console.error("Erreur recherche :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


router.get("/", async (req, res) => {
  try {
    // Si tu veux limiter aux "Etudiant" :
    const query = {}; // ou { role: "Etudiant" } si tu stockes le rôle
    const etudiants = await User.find(query)
      .select("fullname phone level gender") // <-- ajouter gender ici
      .sort({ fullname: 1 })
      .lean();
    res.json(etudiants);
  } catch (err) {
    console.error("Erreur récupération étudiants :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// Récupérer les étudiants d’un niveau
router.get("/niveau/:niveau", async (req, res) => {
  try {
    const niveau = decodeURIComponent(req.params.niveau);
    const etudiants = await User.find({ level: niveau });
    res.json(etudiants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


router.post("/logout", (req, res) => {
  res.clearCookie("etudiantId");
  res.json({ message: "Déconnexion réussie." });
});

router.get("/", requireDaf, async (req, res) => {
  try {
    const { niveau } = req.query;
    const query = { role: "etudiant" };
    if (niveau) query.niveau = niveau;
    const etudiants = await User.find(query).select("_id fullname email niveau").lean();
    res.json(etudiants);
  } catch (err) {
    console.error("GET /etudiants :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// GET /api/etudiants/recherche?q=nom
router.get("/recherche", requireDaf, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    const query = {
      role: "etudiant",
      $or: [
        { fullname: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ]
    };

    const etudiants = await User.find(query)
      .select("_id fullname email niveau")
      .sort({ fullname: 1 })
      .lean();

    res.json(etudiants);
  } catch (err) {
    console.error("GET /etudiants/recherche :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


module.exports = router;
