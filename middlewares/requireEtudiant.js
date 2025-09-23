module.exports = (req, res, next) => {
  console.log("Cookies reçus :", req.cookies);
  const { etudiantId } = req.cookies;
  if (!etudiantId) return res.status(401).json({ message: "Non autorisé (étudiant)." });
  req.etudiantId = etudiantId;
  next();
};
