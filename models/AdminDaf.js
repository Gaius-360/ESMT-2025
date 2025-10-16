// models/AdminDaf.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminDafSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: "DAF" }
}, { timestamps: true });

// Hash avant sauvegarde
adminDafSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Vérification mot de passe
adminDafSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("AdminDaf", adminDafSchema);
