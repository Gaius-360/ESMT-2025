module.exports = (req, res, next) => {
  console.log("Cookies reçus (admin) :", req.cookies);
  const { adminId } = req.cookies;
  if (!adminId) return res.status(401).json({ message: "Non autorisé (admin)." });
  req.adminId = adminId;
  next();
};
