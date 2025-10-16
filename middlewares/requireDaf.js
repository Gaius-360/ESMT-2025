// middlewares/requireDaf.js
module.exports = async (req, res, next) => {
  const { dafId } = req.cookies;
  if (!dafId) return res.status(401).json({ message: "Non autorisé (DAF)" });
  req.dafId = dafId;
  next();
};
