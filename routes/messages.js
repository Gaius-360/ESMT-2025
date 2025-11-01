const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../models/Message");
const User = require("../models/User");
const requireAdmin = require("../middlewares/requireAdmin");
const requireEtudiant = require("../middlewares/requireEtudiant");
const Notification = require("../models/Notification");

const router = express.Router();

// ----- Multer -----
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/messages");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ------------------------
// ADMIN -> Étudiant
// ------------------------

// Envoi à un étudiant précis
router.post("/admin/send", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(receiverId))
      return res.status(400).json({ error: "ID destinataire invalide" });

    const filePath = req.file ? `/uploads/messages/${req.file.filename}` : null;

    let message = await Message.create({
      sender: req.adminId,
      senderModel: "Admin",
      receiver: receiverId,
      receiverModel: "User",
      content: content || "",
      type: filePath ? "file" : "text",
      file: filePath,
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    const io = req.app.get("io");
    io.to(receiverId.toString()).emit("newMessage", message);

    // Créer notification
    await Notification.create({
      user: receiverId,
      sender: req.adminId,
      senderModel: "Admin",
      message: content || (filePath ? "Fichier envoyé" : ""),
      type: "message"
    });

    // Émettre notification en temps réel
    io.to(receiverId.toString()).emit("newNotification", {
      senderId: req.adminId,
      message: content || (filePath ? "Fichier envoyé" : ""),
      createdAt: new Date()
    });


    // 🚀 Envoi notification push
const sendPush = req.app.get('sendPushToEtudiant');
await sendPush(
  receiverId,
  '📩 Nouveau message',
  'Vous avez reçu un message.',
  'https://esmt-2025.onrender.com/Student_Space/connexion/etudiant_connexion.html'
);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi message (admin)" });
  }
});

// Envoi à tous les étudiants d’un niveau
router.post("/admin/send/level", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { level, content } = req.body;
    if (!level) return res.status(400).json({ error: "Niveau requis" });

    const students = await User.find({ level }).lean();
    if (!students.length) return res.status(404).json({ error: "Aucun étudiant trouvé" });

    const filePath = req.file ? `/uploads/messages/${req.file.filename}` : null;
    const io = req.app.get("io");
    const messages = [];

    for (let student of students) {
      let message = await Message.create({
        sender: req.adminId,
        senderModel: "Admin",
        receiver: student._id,
        receiverModel: "User",
        content: content || "",
        type: filePath ? "file" : "text",
        file: filePath,
      });

      message = await Message.findById(message._id)
        .populate("sender", "fullname email")
        .populate("receiver", "fullname email")
        .lean();

      messages.push(message);

      // Notification pour chaque étudiant
      await Notification.create({
        user: student._id,
        sender: req.adminId,
        senderModel: "Admin",
        message: content || (filePath ? "Fichier envoyé" : ""),
        type: "message"
      });

      // Émettre notification
      io.to(student._id.toString()).emit("newMessage", message);
      io.to(student._id.toString()).emit("newNotification", {
        senderId: req.adminId,
        message: content || (filePath ? "Fichier envoyé" : ""),
        createdAt: new Date()
      });
    }

    res.status(201).json({ success: true, count: messages.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi message niveau" });
  }
});

// Récup messages avec un étudiant
router.get("/admin/thread/:studentId", requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const adminId = req.adminId;
    if (!mongoose.Types.ObjectId.isValid(studentId))
      return res.status(400).json({ error: "ID étudiant invalide" });

    const messages = await Message.find({
      $or: [
        { sender: adminId, receiver: studentId },
        { sender: studentId, receiver: adminId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération messages (admin)" });
  }
});

// ------------------------
// Étudiant -> Admin
// ------------------------

router.post("/student/send", requireEtudiant, upload.single("file"), async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.etudiantId;
    if (!mongoose.Types.ObjectId.isValid(receiverId))
      return res.status(400).json({ error: "ID destinataire invalide" });

    const filePath = req.file ? `/uploads/messages/${req.file.filename}` : null;

    let message = await Message.create({
      sender: senderId,
      senderModel: "User",
      receiver: receiverId,
      receiverModel: "Admin",
      content: content || "",
      type: filePath ? "file" : "text",
      file: filePath,
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    const io = req.app.get("io");
    io.to(receiverId.toString()).emit("newMessage", message);

    // Notification
    await Notification.create({
      user: receiverId,
      sender: senderId,
      message: content || (filePath ? "Fichier envoyé" : ""),
      type: "message"
    });

    io.to(receiverId.toString()).emit("newNotification", {
      senderId: senderId,
      message: content || (filePath ? "Fichier envoyé" : ""),
      createdAt: new Date()
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi message (étudiant)" });
  }
});

router.get("/student/thread/:adminId", requireEtudiant, async (req, res) => {
  try {
    const { adminId } = req.params;
    const studentId = req.etudiantId;
    if (!mongoose.Types.ObjectId.isValid(adminId))
      return res.status(400).json({ error: "ID admin invalide" });

    const messages = await Message.find({
      $or: [
        { sender: studentId, receiver: adminId },
        { sender: adminId, receiver: studentId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération messages (étudiant)" });
  }
});

module.exports = router;
