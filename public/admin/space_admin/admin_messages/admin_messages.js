// === VARIABLES GLOBALES ===
let socket;
let admin = null;
let selectedTarget = null; // id étudiant ou niveau
let targetType = null; // "student" ou "level"
let notifications = [];

// --- DOM refs ---
const studentSearch = document.getElementById("studentSearch");
const studentList = document.getElementById("studentList");
const levelList = document.getElementById("levelList");
const chatMessages = document.getElementById("chatMessages");
const chatTitle = document.getElementById("chatTitle");
const messageInput = document.getElementById("messageInput");
const fileInput = document.getElementById("fileInput");
const sendButton = document.getElementById("sendButton");
const notifBell = document.getElementById("notificationBell");
const notifBadge = document.getElementById("notificationBadge");
const notifMenu = document.getElementById("notificationMenu");

// === INITIALISATION ===
init();

async function init() {
  await fetchAdmin();
  initSocket();
  initStudentSearch();
  initLevelSelection();
  initNotificationUI();
}

// --- FETCH ADMIN ---
async function fetchAdmin() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/admin/me", { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    admin = await res.json();
  } catch (err) {
    console.error("Admin non connecté :", err);
    alert("Non connecté en tant qu'admin.");
  }
}

// --- SOCKET.IO ---
function initSocket() {
  socket = io("https://esmt-2025.onrender.com", { withCredentials: true });

  socket.on("connect", () => {
    if (admin && admin._id) socket.emit("joinRoom", admin._id);
  });

  socket.on("newMessage", (msg) => {
    notifications.unshift(msg);
    updateNotificationUI();

    if (selectedTarget && targetType === "student" &&
        (msg.sender?._id === selectedTarget || msg.receiver?._id === selectedTarget)) {
      addMessageToChat(msg);
    }
  });
}

// --- NOTIFICATIONS ---
function initNotificationUI() {
  notifBell.addEventListener("click", (e) => {
    notifMenu.style.display = notifMenu.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    notifMenu.style.display = "none";
  });

  fetchNotifications();
}

async function fetchNotifications() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/notifications/admin", { credentials: "include" });
    if (!res.ok) return;
    notifications = await res.json();
    updateNotificationUI();
  } catch (err) {
    console.error("Erreur fetch notifications :", err);
  }
}

function updateNotificationUI() {
  if (!notifBadge || !notifMenu) return;

  const unreadCount = notifications.filter(n => !n.isRead).length;
  notifBadge.textContent = unreadCount > 0 ? unreadCount : "";
  notifBadge.style.display = unreadCount > 0 ? "inline-block" : "none";

  const list = document.getElementById("notifList");
  list.innerHTML = "";

  if (!notifications.length) {
    list.innerHTML = "<li>Aucune notification</li>";
    return;
  }

  notifications.slice(0, 10).forEach(notif => {
    const li = document.createElement("li");
    li.textContent = `${notif.sender?.fullname || "?"}: ${notif.content || "[Fichier]"}`;
    if (!notif.isRead) li.classList.add("unread");

    li.addEventListener("click", async () => {
      if (notif.sender?._id) openChatWith(notif.sender._id);
      await markAsReadBySender(notif.sender._id);
    });

    list.appendChild(li);
  });
}

async function markAsReadBySender(senderId) {
  try {
    const senderNotifications = notifications.filter(n => n.sender?._id === senderId && !n.isRead);
    for (const notif of senderNotifications) {
      await fetch(`https://esmt-2025.onrender.com/api/notifications/${notif._id}/read`, { method: "PATCH", credentials: "include" });
      notif.isRead = true;
    }
    updateNotificationUI();
  } catch (err) {
    console.error("Erreur markAsReadBySender :", err);
  }
}

// === RECHERCHE ETUDIANTS ===
function initStudentSearch() {
  const runSearch = debounce(async () => {
    const query = studentSearch.value.trim();
    if (!query) return renderHint();

    try {
      const res = await fetch(`https://esmt-2025.onrender.com/api/etudiants/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const students = await res.json();

      if (!students.length) return renderNoResults();

      studentList.innerHTML = students.map(s => `
        <li data-id="${s._id}" title="${s.email}" class="name-search">
          ${s.fullname} <small>(${s.level || "N/A"})</small>
        </li>
      `).join("");

      document.querySelectorAll("#studentList li").forEach(li => {
        li.addEventListener("click", () => selectStudent({ _id: li.dataset.id, fullname: li.textContent }));
      });

    } catch (err) {
      console.error(err);
      studentList.innerHTML = `<li class="error">Erreur de recherche</li>`;
    }
  }, 350);

  studentSearch.addEventListener("input", runSearch);
}

function selectStudent(student) {
  selectedTarget = student._id;
  targetType = "student";
  chatTitle.textContent = student.fullname || "Conversation";
  highlightSelection(student._id);
  chatMessages.innerHTML = "";
  fetchMessages(student._id);
}

function highlightSelection(id) {
  document.querySelectorAll("#studentList li").forEach(li => li.classList.toggle("selected", li.dataset.id === id));
  document.querySelectorAll("#levelList li").forEach(li => li.classList.remove("selected"));
}

// === SELECTION NIVEAU ===
function initLevelSelection() {
  levelList.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => selectLevel(li.dataset.level));
  });
}

function selectLevel(level) {
  selectedTarget = level;
  targetType = "level";
  chatTitle.textContent = `Niveau : ${level}`;
  
  document.querySelectorAll("#levelList li").forEach(li => {
    li.classList.toggle("selected", li.dataset.level === level);
  });
  document.querySelectorAll("#studentList li").forEach(li => li.classList.remove("selected"));
  chatMessages.innerHTML = "";
}

// --- MESSAGES ---
async function fetchMessages(studentId) {
  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/messages/admin/thread/${studentId}`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const messages = await res.json();
    chatMessages.innerHTML = "";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    console.error(err);
    chatMessages.innerHTML = `<div class="message"><div class="bubble">Impossible de charger les messages.</div></div>`;
  }
}

function addMessageToChat(msg) {
  const fromSelf = msg.sender?._id === admin?._id;
  const div = document.createElement("div");
  div.className = fromSelf ? "message admin" : "message student";
  div.innerHTML = `
    <div class="bubble">
      <div class="author">${msg.sender?.fullname ?? ""}</div>
      <div class="content">${escapeHtml(msg.content || "")}</div>
      ${msg.file ? `<div><a href="https://esmt-2025.onrender.com${msg.file}" target="_blank">[Fichier]</a></div>` : ""}
      <div class="time">${new Date(msg.createdAt).toLocaleString()}</div>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- ENVOI MESSAGE ---
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

async function sendMessage() {
  if (!selectedTarget) return alert("Sélectionnez un étudiant ou un niveau.");

  const content = messageInput.value.trim();
  const file = fileInput.files[0];
  if (!content && !file) return;

  const formData = new FormData();
  if (targetType === "student") formData.append("receiverId", selectedTarget);
  else if (targetType === "level") formData.append("level", selectedTarget);

  if (content) formData.append("content", content);
  if (file) formData.append("file", file);

  try {
    const url = targetType === "student"
      ? "https://esmt-2025.onrender.com/api/messages/admin/send"
      : "https://esmt-2025.onrender.com/api/messages/admin/send/level";

    const res = await fetch(url, { method: "POST", body: formData, credentials: "include" });
    const msg = await res.json();
    if (!res.ok) return alert(msg?.error || "Erreur d’envoi.");

    if (targetType === "student") {
      // Message individuel
      addMessageToChat(msg);
    } else {
      // Message envoyé à un niveau : créer un message fictif pour affichage
      const fakeMsg = {
        sender: admin,
        content: content || "[Fichier]",
        createdAt: new Date(),
        file: file ? URL.createObjectURL(file) : null // permet de créer un lien cliquable temporaire
      };
      addMessageToChat(fakeMsg);
      alert(`Message envoyé à ${msg.count} étudiant(s) de ${selectedTarget}`);
    }

    messageInput.value = "";
    fileInput.value = "";

  } catch (err) { 
    console.error(err); 
    alert("Erreur lors de l'envoi du message.");
  }
}

// --- UTILITAIRES ---
function escapeHtml(s) {
  return s.replace(/[&<>'"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function debounce(fn, delay=300) { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

// --- OUVRIR CHAT ---
function openChatWith(studentId) {
  selectedTarget = studentId;
  targetType = "student";
  fetchMessages(studentId);
}

// --- SIDEBAR TOGGLE ---
const sidebar = document.querySelector('.sidebar');
const chat = document.querySelector('.chat');
const toggleBtn = document.getElementById('sidebarToggle');

toggleBtn.addEventListener('click', () => {
  if (window.innerWidth > 768) {
    sidebar.classList.toggle('collapsed');
    chat.classList.toggle('fullwidth');
  } else {
    sidebar.classList.toggle('open');
  }
});