// ====== admin_messages.js (frontend corrigé) ======
const API = "https://esmt-2025.onrender.com";

// === VARIABLES GLOBALES ===
let socket;
let admin = null;
let selectedTarget = null; // id étudiant ou niveau
let targetType = null; // "student" or "level"
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

// utilitaires manquants (rendu hint / no results)
function renderHint() {
  studentList.innerHTML = `<li class="hint">Tapez au moins 2 caractères pour rechercher</li>`;
}
function renderNoResults() {
  studentList.innerHTML = `<li class="muted">Aucun étudiant trouvé</li>`;
}

// escape html
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>'"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function debounce(fn, delay=300) { let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

// === INITIALISATION ===
init();

async function init() {
  await fetchAdminSession(); // set admin before socket join
  initSocket();
  initStudentSearch();
  initLevelSelection();
  initNotificationUI();
}

// Récupérer la session admin (utile pour savoir admin._id)
async function fetchAdminSession() {
  try {
    const res = await fetch(`${API}/api/admin/check`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.connected) admin = data.admin;
    else admin = null;
  } catch (err) {
    console.error("Erreur récupération session admin :", err);
    admin = null;
  }
}

// --- SOCKET.IO ---
function initSocket() {
  // utilise l'API que tu as défini
  socket = io(API, { withCredentials: true });

  socket.on("connect", () => {
    if (admin && admin._id) {
      socket.emit("joinRoom", admin._id);
      console.log("Socket connecté – room joined:", admin._id);
    }
  });

  socket.on("newMessage", (msg) => {
    // Notif real-time
    notifications.unshift(msg);
    updateNotificationUI();

    // Si conversation ouverte avec l'étudiant concerné -> afficher
    if (selectedTarget && targetType === "student") {
      const id = selectedTarget.toString();
      const sId = (msg.sender?._id || msg.sender)?.toString();
      const rId = (msg.receiver?._id || msg.receiver)?.toString();
      if (sId === id || rId === id) addMessageToChat(msg);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket déconnecté");
  });
}

// --- NOTIFICATIONS ---
function initNotificationUI() {
  notifBell.addEventListener("click", (e) => {
    notifMenu.style.display = notifMenu.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    if (notifMenu) notifMenu.style.display = "none";
  });

  fetchNotifications();
}

async function fetchNotifications() {
  try {
    const res = await fetch(`${API}/api/notifications/admin`, { credentials: "include" });
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
  if (!list) return;
  list.innerHTML = "";
  if (!notifications.length) {
    list.innerHTML = "<li>Aucune notification</li>";
    return;
  }
  notifications.slice(0, 10).forEach(notif => {
    const li = document.createElement("li");
    li.textContent = `${notif.sender?.fullname || "?"}: ${notif.message || notif.content || "[Fichier]"}`;
    if (!notif.isRead) li.classList.add("unread");
    li.addEventListener("click", async () => {
      if (notif.sender?._id) openChatWith(notif.sender._id);
      await markAsReadBySender(notif.sender?._id);
    });
    list.appendChild(li);
  });
}

async function markAsReadBySender(senderId) {
  try {
    if (!senderId) return;
    const senderNotifications = notifications.filter(n => n.sender?._id === senderId && !n.isRead);
    for (const notif of senderNotifications) {
      await fetch(`${API}/api/notifications/${notif._id}/read`, { method: "PATCH", credentials: "include" });
      notif.isRead = true;
    }
    updateNotificationUI();
  } catch (err) {
    console.error("Erreur markAsReadBySender :", err);
  }
}

// === RECHERCHE ETUDIANTS ===
function initStudentSearch() {
  renderHint();
  const runSearch = debounce(async () => {
    const query = studentSearch.value.trim();
    if (!query || query.length < 2) return renderHint();

    try {
      const res = await fetch(`${API}/api/etudiants/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const students = await res.json();

      if (!students.length) return renderNoResults();

      // build list with dataset fullname (clean)
      studentList.innerHTML = students.map(s => `
        <li data-id="${s._id}" data-fullname="${escapeHtml(s.fullname || s.email)}" title="${escapeHtml(s.email || '')}" class="name-search">
          ${escapeHtml(s.fullname || s.email)} <small>(${escapeHtml(s.level || "N/A")})</small>
        </li>
      `).join("");

      document.querySelectorAll("#studentList li").forEach(li => {
        li.addEventListener("click", () => {
          selectStudent({ _id: li.dataset.id, fullname: li.dataset.fullname });
        });
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

  // charger messages pour le niveau
  fetchMessagesForLevel(level);
}

async function fetchMessagesForLevel(level) {
  try {
    const res = await fetch(`${API}/api/messages/admin/thread/level/${encodeURIComponent(level)}`, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const messages = await res.json();
    chatMessages.innerHTML = "";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    console.error(err);
    chatMessages.innerHTML = `<div class="message"><div class="bubble">Impossible de charger les messages pour ce niveau.</div></div>`;
  }
}

// --- MESSAGES ---
async function fetchMessages(studentId) {
  try {
    const res = await fetch(`${API}/api/messages/admin/thread/${studentId}`, { credentials: "include" });
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
  const sender = msg.sender || {};
  const fromSelf = admin && (sender._id === admin._id || sender._id === admin?._id);

  const div = document.createElement("div");
  div.className = fromSelf ? "message admin" : "message student";
  div.dataset.messageId = msg._id;

  const content = escapeHtml(msg.content || "");
  const fileLink = msg.file ? `<div><a href="${API}${msg.file}" target="_blank">[Fichier]</a></div>` : "";
  const author = escapeHtml(sender.fullname || "");
  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "";

  const deleteBtn = fromSelf
    ? `<button class="delete-msg" data-id="${msg._id}" style="margin-left:5px;color:red;border:none;background:none;cursor:pointer;">❌</button>`
    : "";

  div.innerHTML = `
    <div class="bubble">
      <div class="author">${author} ${deleteBtn}</div>
      <div class="content">${content}</div>
      ${fileLink}
      <div class="time">${time}</div>
    </div>
  `;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (fromSelf) {
    const btn = div.querySelector(".delete-msg");
    btn.addEventListener("click", async () => {
      if (!confirm("Voulez-vous supprimer ce message définitivement ?")) return;
      try {
        const res = await fetch(`${API}/api/messages/admin/message/${msg._id}`, {
          method: "DELETE",
          credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) return alert(data.error || "Erreur suppression");
        div.remove();
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression du message.");
      }
    });
  }
}

// Supprimer côté destinataire en temps réel
socket.on("deleteMessage", ({ messageId }) => {
  const msgDiv = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
  if (msgDiv) msgDiv.remove();
});


// --- ENVOI MESSAGE ---
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

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
      ? `${API}/api/messages/admin/send`
      : `${API}/api/messages/admin/send/level`;

    const res = await fetch(url, { method: "POST", body: formData, credentials: "include" });
    const msg = await res.json();
    if (!res.ok) return alert(msg?.error || "Erreur d’envoi.");

    if (targetType === "student") {
      // Message individuel : backend renvoie l'objet message
      addMessageToChat(msg);
    } else {
      // Message envoyé à un niveau : backend renvoie { success, count }
      const fakeMsg = {
        sender: admin,
        content: content || "[Fichier]",
        createdAt: new Date(),
        file: file ? URL.createObjectURL(file) : null
      };
      addMessageToChat(fakeMsg);
      alert(`Message envoyé à ${msg.count || 0} étudiant(s) de ${selectedTarget}`);
    }

    messageInput.value = "";
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'envoi du message.");
  }
}

// --- OUVRIR CHAT (notification click) ---
function openChatWith(studentId) {
  selectedTarget = studentId;
  targetType = "student";
  // find and set highlighted student name if existing
  const li = document.querySelector(`#studentList li[data-id="${studentId}"]`);
  const fullname = li ? li.dataset.fullname : "Conversation";
  if (fullname) chatTitle.textContent = fullname;
  highlightSelection(studentId);
  fetchMessages(studentId);
}

// --- SIDEBAR TOGGLE ---
const sidebar = document.querySelector('.sidebar');
const chat = document.querySelector('.chat');
const toggleBtn = document.getElementById('sidebarToggle');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      sidebar.classList.toggle('collapsed');
      chat.classList.toggle('fullwidth');
    } else {
      sidebar.classList.toggle('open');
    }
  });
}
