const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");

const router = express.Router();

// assume requireAdmin and requireEtudiant middlewares exist and set req.adminId / req.etudiantId
const requireAdmin = require("../middlewares/requireAdmin");
const requireEtudiant = require("../middlewares/requireEtudiant");

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
      createdAt: new Date(),
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    const io = req.app.get("io");
    if (io) io.to(receiverId.toString()).emit("newMessage", message);

    // Créer notification
    await Notification.create({
      user: receiverId,
      sender: req.adminId,
      senderModel: "Admin",
      message: content || (filePath ? "Fichier envoyé" : ""),
      type: "message"
    });

    // Émettre notification en temps réel
    if (io) io.to(receiverId.toString()).emit("newNotification", {
      senderId: req.adminId,
      message: content || (filePath ? "Fichier envoyé" : ""),
      createdAt: new Date()
    });

    // Envoi notification push (si hook présent)
    try {
      const sendPush = req.app.get('sendPushToEtudiant');
      if (typeof sendPush === "function") {
        // fire-and-forget but await to catch errors (optional)
        await sendPush(
          receiverId,
          '📩 Nouveau message',
          content ? content.slice(0, 100) : 'Vous avez reçu un message.',
          'https://esmt-2025.onrender.com/Student_Space/connexion/etudiant_connexion.html'
        );
      }
    } catch (pushErr) {
      console.error("Erreur sendPush (non bloquante) :", pushErr);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi message (admin)" });
  }
});

// Envoi à tous les étudiants d’un niveau (optimisé)
router.post("/admin/send/level", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { level, content } = req.body;
    if (!level) return res.status(400).json({ error: "Niveau requis" });

    const students = await User.find({ level }).lean();
    if (!students.length) return res.status(404).json({ error: "Aucun étudiant trouvé" });

    const filePath = req.file ? `/uploads/messages/${req.file.filename}` : null;
    const io = req.app.get("io");

    // Create messages in parallel (but keep DB inserts as array of promises)
    const createPromises = students.map(student => Message.create({
      sender: req.adminId,
      senderModel: "Admin",
      receiver: student._id,
      receiverModel: "User",
      content: content || "",
      type: filePath ? "file" : "text",
      file: filePath,
      level,
      createdAt: new Date(),
    }));

    const createdMessages = await Promise.all(createPromises);

    // populate them (parallel)
    const populatedPromises = createdMessages.map(m =>
      Message.findById(m._id)
        .populate("sender", "fullname email")
        .populate("receiver", "fullname email")
        .lean()
    );
    const messages = await Promise.all(populatedPromises);

    // Notifications + socket emits (in parallel)
    const notifPromises = students.map(student => {
      return Notification.create({
        user: student._id,
        sender: req.adminId,
        senderModel: "Admin",
        message: content || (filePath ? "Fichier envoyé" : ""),
        type: "message"
      }).then(() => {
        if (io) {
          const studentMsg = messages.find(mm => mm.receiver?._id?.toString() === student._id.toString());
          if (studentMsg) io.to(student._id.toString()).emit("newMessage", studentMsg);
          io.to(student._id.toString()).emit("newNotification", {
            senderId: req.adminId,
            message: content || (filePath ? "Fichier envoyé" : ""),
            createdAt: new Date()
          });
        }
      });
    });

    await Promise.all(notifPromises);

    // Push (non-blocking): try to send once to the level (if you have such logic)
    try {
      const sendPush = req.app.get('sendPushToEtudiant');
      if (typeof sendPush === "function") {
        // if you want to send one push to all or to each student, adapt here.
        // we'll attempt one overall push (non-fatal)
        await sendPush(
          null, // if your function expects a user id, adapt accordingly
          '📢 Message pour votre niveau',
          (content || 'Un message important pour votre niveau').slice(0, 120),
          'https://esmt-2025.onrender.com/Student_Space/connexion/etudiant_connexion.html'
        );
      }
    } catch (pushErr) {
      console.error("Erreur sendPush niveau (non bloquante):", pushErr);
    }

    res.status(201).json({ success: true, count: messages.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi message niveau" });
  }
});

// Récup messages entre admin et un étudiant
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

// Récupérer messages envoyés par admin au niveau (utile côté front)
router.get("/admin/thread/level/:level", requireAdmin, async (req, res) => {
  try {
    const { level } = req.params;
    const adminId = req.adminId;

    const messages = await Message.find({
      sender: adminId,
      receiverModel: "User",
      level,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération messages niveau" });
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
      createdAt: new Date(),
    });

    message = await Message.findById(message._id)
      .populate("sender", "fullname email")
      .populate("receiver", "fullname email")
      .lean();

    const io = req.app.get("io");
    if (io) io.to(receiverId.toString()).emit("newMessage", message);

    // Notification
    await Notification.create({
      user: receiverId,
      sender: senderId,
      message: content || (filePath ? "Fichier envoyé" : ""),
      type: "message"
    });

    if (io) io.to(receiverId.toString()).emit("newNotification", {
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

// ------------------------
// SUPPRESSION MESSAGE DEFINITIVE
// ------------------------
router.delete("/admin/message/:messageId", requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(messageId))
      return res.status(400).json({ error: "ID message invalide" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message non trouvé" });

    // Supprimer le fichier associé si existant
    if (message.file) {
      const filePath = path.join(__dirname, "../", message.file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Message.deleteOne({ _id: messageId });

    const io = req.app.get("io");
    if (io && message.receiver) {
      io.to(message.receiver.toString()).emit("deleteMessage", { messageId });
    }

    res.json({ success: true, message: "Message supprimé définitivement" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression message" });
  }
});

module.exports = router;
