// ====== admin_messages.js (version propre) ======
const API = "https://esmt-2025.onrender.com";

// === VARIABLES GLOBALES ===
let socket = null;
let admin = null;
let selectedTarget = null;
let targetType = null;
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
const deleteBtn = document.getElementById("deleteSelectedBtn");

let selectionMode = false;

// === UTILITAIRES ===
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAdminSession();
  initSocket();
  initStudentSearch();
  initLevelSelection();
  initNotificationUI();
  updateDeleteButtonState();
});

// === SESSION ADMIN ===
async function fetchAdminSession() {
  try {
    const res = await fetch(`${API}/api/admin/check`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    admin = data.connected ? data.admin : null;
  } catch (err) {
    console.error("Erreur récupération session admin :", err);
  }
}

// === SOCKET.IO ===
function initSocket() {
  socket = io(API, { withCredentials: true });

  socket.on("connect", () => {
    if (admin && admin._id) socket.emit("joinRoom", admin._id);
  });

  socket.on("newMessage", (msg) => {
    notifications.unshift(msg);
    updateNotificationUI();
    if (selectedTarget) {
      const id = selectedTarget.toString();
      const sId = (msg.sender?._id || msg.sender)?.toString();
      const rId = (msg.receiver?._id || msg.receiver)?.toString();
      if ((targetType === "student") && (sId === id || rId === id)) {
        addMessageToChat(msg);
      }
    }
  });

  socket.on("deleteMessage", ({ messageId }) => {
    const msgDiv = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
    if (msgDiv) msgDiv.remove();
    updateDeleteButtonState();
  });
}

// === NOTIFICATIONS ===
function initNotificationUI() {
  if (!notifBell || !notifMenu) return;
  notifBell.addEventListener("click", (e) => {
    notifMenu.style.display = notifMenu.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  });
  document.addEventListener("click", () => { if (notifMenu) notifMenu.style.display = "none"; });
  fetchNotifications();
}

async function fetchNotifications() {
  try {
    const res = await fetch(`${API}/api/notifications/admin`, { credentials: "include" });
    if (!res.ok) return;
    notifications = await res.json();
    updateNotificationUI();
  } catch (err) {
    console.error(err);
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
  if (!notifications.length) return list.innerHTML = "<li>Aucune notification</li>";

  notifications.slice(0, 10).forEach(n => {
    const li = document.createElement("li");
    li.textContent = `${n.sender?.fullname || "?"}: ${n.message || n.content || "[Fichier]"}`;
    if (!n.isRead) li.classList.add("unread");
    li.addEventListener("click", async () => {
      if (n.sender?._id) openChatWith(n.sender._id);
      await markAsReadBySender(n.sender?._id);
    });
    list.appendChild(li);
  });
}

async function markAsReadBySender(senderId) {
  try {
    if (!senderId) return;
    const senderNotifs = notifications.filter(n => n.sender?._id === senderId && !n.isRead);
    for (const n of senderNotifs) {
      await fetch(`${API}/api/notifications/${n._id}/read`, { method: "PATCH", credentials: "include" });
      n.isRead = true;
    }
    updateNotificationUI();
  } catch (err) {
    console.error(err);
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
      if (!res.ok) throw new Error();
      const students = await res.json();
      if (!students.length) return renderNoResults();
      studentList.innerHTML = "";
      students.forEach(s => {
        const li = document.createElement("li");
        li.dataset.id = s._id;
        li.dataset.fullname = escapeHtml(s.fullname || s.email);
        li.title = escapeHtml(s.email || "");
        li.className = "name-search";
        li.innerHTML = `${escapeHtml(s.fullname || s.email)} <small>(${escapeHtml(s.level || "N/A")})</small>`;
        li.addEventListener("click", () => selectStudent({_id: s._id, fullname: li.dataset.fullname}));
        studentList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      studentList.innerHTML = `<li class="error">Erreur de recherche</li>`;
    }
  }, 350);
  studentSearch.addEventListener("input", runSearch);
}

function renderHint() { studentList.innerHTML = `<li class="hint">Tapez au moins 2 caractères pour rechercher</li>`; }
function renderNoResults() { studentList.innerHTML = `<li class="muted">Aucun étudiant trouvé</li>`; }

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
  levelList.querySelectorAll("li").forEach(li => li.addEventListener("click", () => selectLevel(li.dataset.level)));
}

function selectLevel(level) {
  selectedTarget = level;
  targetType = "level";
  chatTitle.textContent = `Niveau : ${level}`;
  document.querySelectorAll("#levelList li").forEach(li => li.classList.toggle("selected", li.dataset.level === level));
  document.querySelectorAll("#studentList li").forEach(li => li.classList.remove("selected"));
  chatMessages.innerHTML = "";
  fetchMessagesForLevel(level);
}

// === MESSAGES ===
async function fetchMessages(studentId) {
  try {
    const res = await fetch(`${API}/api/messages/admin/thread/${studentId}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const messages = await res.json();
    chatMessages.innerHTML = "";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateDeleteButtonState();
  } catch {
    chatMessages.innerHTML = `<div class="message"><div class="bubble">Impossible de charger les messages.</div></div>`;
  }
}

async function fetchMessagesForLevel(level) {
  try {
    const res = await fetch(`${API}/api/messages/admin/thread/level/${encodeURIComponent(level)}`, { credentials: "include" });
    if (!res.ok) throw new Error();
    const messages = await res.json();
    chatMessages.innerHTML = "";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateDeleteButtonState();
  } catch {
    chatMessages.innerHTML = `<div class="message"><div class="bubble">Impossible de charger les messages pour ce niveau.</div></div>`;
  }
}

function addMessageToChat(msg) {
  const sender = msg.sender || {};
  const fromSelf = admin && (sender._id === admin._id || sender._id === admin?._id);

  const div = document.createElement("div");
  div.className = fromSelf ? "message admin" : "message student";
  div.dataset.messageId = msg._id;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `
    <div class="author">${escapeHtml(sender.fullname || "")}</div>
    <div class="content">${escapeHtml(msg.content || "")}</div>
    ${msg.file ? `<div><a href="${API}${msg.file}" target="_blank">[Fichier]</a></div>` : ""}
    <div class="time">${msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</div>
  `;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "msg-select";
  checkbox.style.order = fromSelf ? 1 : 0;

  div.appendChild(fromSelf ? checkbox : checkbox);
  div.appendChild(bubble);

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  checkbox.addEventListener("change", () => {
    div.classList.toggle("selected", checkbox.checked);
  });

  updateDeleteButtonState();
}

// === DELETE MESSAGES ===
deleteBtn.addEventListener("click", async () => {
  if (!selectionMode) {
    selectionMode = true;
    Array.from(document.querySelectorAll(".msg-select")).forEach(cb => cb.style.display = "inline-block");
    deleteBtn.textContent = "Supprimer les messages sélectionnés";
    return;
  }

  const selected = Array.from(document.querySelectorAll(".msg-select:checked")).map(cb => cb.closest(".message").dataset.messageId);
  if (!selected.length) {
    selectionMode = false;
    Array.from(document.querySelectorAll(".msg-select")).forEach(cb => cb.style.display = "none");
    deleteBtn.textContent = "Suppression de un ou plusieurs messages";
    return;
  }

  if (!confirm(`Voulez-vous supprimer ${selected.length} message(s) définitivement ?`)) return;

  for (const messageId of selected) {
    try {
      const res = await fetch(`${API}/api/messages/admin/message/${messageId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) continue;
      const div = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
      if (div) div.remove();
    } catch (err) { console.error(err); }
  }

  selectionMode = false;
  Array.from(document.querySelectorAll(".msg-select")).forEach(cb => cb.style.display = "none");
  deleteBtn.textContent = selected.length ? "Suppression de un ou plusieurs messages" : "Suppression de un ou plusieurs messages";

  updateDeleteButtonState();
});

function updateDeleteButtonState() {
  if (!chatMessages.children.length) {
    deleteBtn.style.display = "none";
    selectionMode = false;
  } else {
    deleteBtn.style.display = "block";
    deleteBtn.textContent = selectionMode ? "Supprimer les messages sélectionnés" : "Suppression de un ou plusieurs messages";
    Array.from(document.querySelectorAll(".msg-select")).forEach(cb => cb.style.display = selectionMode ? "inline-block" : "none");
  }
}

// === SEND MESSAGE ===
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

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
    const url = targetType === "student" ? `${API}/api/messages/admin/send` : `${API}/api/messages/admin/send/level`;
    const res = await fetch(url, { method: "POST", body: formData, credentials: "include" });
    const msg = await res.json();
    if (!res.ok) return alert(msg?.error || "Erreur d’envoi.");

    if (targetType === "student") addMessageToChat(msg);
    else {
      const fakeMsg = { sender: admin, content: content || "[Fichier]", createdAt: new Date(), file: file ? URL.createObjectURL(file) : null };
      addMessageToChat(fakeMsg);
      alert(`Message envoyé à ${msg.count || 0} étudiant(s) de ${selectedTarget}`);
    }

    messageInput.value = "";
    fileInput.value = "";
  } catch (err) { console.error(err); alert("Erreur lors de l'envoi du message."); }
}

// === OPEN CHAT FROM NOTIF ===
function openChatWith(studentId) {
  selectedTarget = studentId;
  targetType = "student";
  const li = document.querySelector(`#studentList li[data-id="${studentId}"]`);
  const fullname = li ? li.dataset.fullname : "Conversation";
  chatTitle.textContent = fullname;
  highlightSelection(studentId);
  fetchMessages(studentId);
}

// === SIDEBAR TOGGLE ===
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
