require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// --- Socket.IO ---
const ALLOWED_ORIGINS = [
  "http://localhost:5501",
  "https://esmt-2025.onrender.com",
  process.env.CLIENT_ORIGIN
];

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// 🔒 Middleware de blocage global (développeur)
const checkPlatformLock = require("./middlewares/checkPlatformLock");
app.use(checkPlatformLock);

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// exposer io aux routes
app.set("io", io);

// --- MongoDB ---
console.log("MONGO_URL =", process.env.MONGO_URL);

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connecté"))
.catch(err => console.error("❌ Erreur MongoDB :", err));

// --- Routes ---
app.use("/api/etudiants", require("./routes/etudiants"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/matieres", require("./routes/matieres"));
app.use("/api/releve", require("./routes/modeleReleve"));
app.use("/api/releves", require("./routes/modeleReleve"));
app.use("/api/absences", require("./routes/absences"));
app.use("/api/emplois", require("./routes/emplois"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/notifOnlyStudent", require("./routes/notifOnlyStudent"));
app.use("/api/paiements", require("./routes/paiements"));
app.use("/api/adminDaf", require("./routes/adminDaf"));



// --- Socket.IO listeners ---
io.on("connection", (socket) => {
  console.log("🔌 connecté :", socket.id);

  socket.on("joinRoom", (userId) => {
    if (typeof userId === "string" && userId.length >= 12) {
      socket.join(userId);
      console.log(`👥 ${socket.id} a rejoint la salle ${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ déconnecté :", socket.id);
  });
});

// --- Racine bloquée ---
app.get("/", (req, res) => {
  res.status(404).send("Accès direct non autorisé. Utilisez /login.html ou /login_admin.html");
});



const webpush = require('web-push');
const PushSubscription = require('./models/PushSubscription');


webpush.setVapidDetails(
`mailto:${process.env.MAIL_FROM || 'admin@esmt-2025.com'}`,
process.env.VAPID_PUBLIC_KEY,
process.env.VAPID_PRIVATE_KEY
);


// ajout route push
app.use('/api/push', require('./routes/push'));


// fonction utilitaire globale
app.set('sendPushToEtudiant', async (etudiantId, title, message, url) => {
try {
const subs = await PushSubscription.find({ etudiant: etudiantId });
if (!subs || subs.length === 0) return;


const payload = JSON.stringify({ title, message, url });
for (const s of subs) {
webpush.sendNotification(s.subscription, payload).catch(err => {
console.error('Erreur envoi push:', err);
// Optionnel: si err.statusCode === 410 -> supprimer l'abonnement
});
}
} catch (err) {
console.error('sendPushToEtudiant error', err);
}
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
