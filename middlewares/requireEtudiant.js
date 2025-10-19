// middlewares/requireEtudiant.js
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const { etudiantId } = req.cookies;
  if (!etudiantId) {
    return res.status(401).json({ message: "Non autorisé." });
  }

  try {
    // 🔎 Vérifie si l'étudiant existe dans MongoDB
    const user = await User.findById(etudiantId);
    if (!user) {
      // 🧹 Supprime le cookie invalide
      res.clearCookie("etudiantId");
      return res.status(401).json({ message: "Session invalide ou utilisateur supprimé." });
    }

    // ✅ Étudiant valide → on continue
    req.etudiantId = user._id;
    next();
  } catch (err) {
    console.error("Erreur requireEtudiant :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
