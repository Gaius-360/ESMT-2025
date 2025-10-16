// routes/adminDaf.js
const express = require("express");
const bcrypt = require("bcrypt");
const AdminDaf = require("../models/AdminDaf");
const router = express.Router();

// ✅ Inscription DAF
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await AdminDaf.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email déjà utilisé." });

    const daf = new AdminDaf({ email, password });
    await daf.save();
    res.status(201).json({ message: "Compte DAF créé avec succès." });
  } catch (err) {
    console.error("Erreur inscription DAF :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Connexion DAF
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const daf = await AdminDaf.findOne({ email });
    if (!daf || !(await daf.comparePassword(password))) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    res.cookie("dafId", daf._id.toString(), {
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000,
      sameSite: "Lax",
      secure: false
    });

    res.json({ message: "Connexion réussie." });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Vérification session
router.get("/check", async (req, res) => {
  const { dafId } = req.cookies;
  if (!dafId) return res.json({ connected: false });

  try {
    const daf = await AdminDaf.findById(dafId).select("-password");
    if (!daf) return res.json({ connected: false });

    res.json({ connected: true, daf });
  } catch {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ✅ Déconnexion
router.post("/logout", (req, res) => {
  res.clearCookie("dafId");
  res.json({ message: "Déconnexion réussie." });
});

module.exports = router;
