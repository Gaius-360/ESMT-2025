const express = require("express");
const Admin = require("../models/Admin");
const router = express.Router();
const requireAdmin = require("../middlewares/requireAdmin");

// ✅ Inscription admin (un seul compte possible)
router.post("/register", async (req, res) => {
  const { email, password, fullname } = req.body;

  try {
    

    // Vérifier si l'email est déjà utilisé (sécurité supplémentaire)
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email déjà utilisé." });
    }

    // Créer le premier (et unique) administrateur
    const newAdmin = new Admin({ email, password, fullname });
    await newAdmin.save();

    res.status(201).json({ message: "Administrateur inscrit avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// ✅ Connexion admin
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    res.cookie("adminId", admin._id.toString(), {
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2h
      sameSite: "Lax",
      secure: false
    });

    res.status(200).json({ message: "Connexion réussie." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Vérification session admin
router.get("/check", async (req, res) => {
  const { adminId } = req.cookies;
  if (!adminId) return res.json({ connected: false });

  try {
    const admin = await Admin.findById(adminId).select("-password");
    if (!admin) return res.json({ connected: false });

    res.json({ connected: true, admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Changer mot de passe
router.patch("/change-password", requireAdmin, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ message: "Administrateur introuvable." });

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Ancien mot de passe incorrect." });

    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Mot de passe modifié avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Route admin connecté
router.get("/me", requireAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select("-password");
    if (!admin) return res.status(404).json({ error: "Admin non trouvé" });
    res.json(admin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ Liste admins pour étudiants (public)
router.get("/list", async (req, res) => {
  try {
    const admins = await Admin.find().select("fullname email");
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ Déconnexion
router.post("/logout", (req, res) => {
  res.clearCookie("adminId");
  res.json({ message: "Déconnexion réussie." });
});

module.exports = router;
