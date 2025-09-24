// testMongo.js
// ✅ Vérifie que dotenv lit bien le .env et teste la connexion MongoDB

require('dotenv').config(); // toujours en premier
const mongoose = require('mongoose');

// 🔹 Debug : toutes les variables d'environnement
console.log("Toutes les variables d'environnement :");
console.log(process.env);

// 🔹 Debug : MONGO_URL
console.log("MONGO_URL utilisée :", process.env.MONGO_URL);

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("❌ Erreur : MONGO_URL n'est pas définie. Vérifie ton fichier .env à la racine de backend/");
  process.exit(1);
}

// 🔹 Connexion MongoDB
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB connecté avec succès !");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Erreur MongoDB :", err);
    process.exit(1);
  });
