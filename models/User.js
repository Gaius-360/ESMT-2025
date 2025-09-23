const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: String,
  gender: {
    type: String,
    enum: ["Homme", "Femme"],
  },
  birthdate: Date,
  level: {
    type: String,
    enum: ["Licence 1", "Licence 2", "Licence 3 - RT", "Licence 3 - ASR"],
  },
  role: {
    type: String,
    enum: ["Etudiant"],
    default: "Etudiant",
  },

}, {
  timestamps: true,
});

// Hashage du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Méthode de comparaison de mot de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
