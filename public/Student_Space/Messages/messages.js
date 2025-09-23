// messages.js (étudiant)
let socket;
let me = null;               // étudiant connecté
let selectedAdminId = null;

const adminList = document.getElementById("adminList");
const chatTitle = document.getElementById("chatTitle");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const fileInput = document.getElementById("fileInput");
const sendButton = document.getElementById("sendButton");

init();

async function init() {
  await fetchMe();
  initSocket();
  await fetchAdmins();
}

async function fetchMe() {
  try {
    const res = await fetch("http://localhost:5000/api/etudiants/me", { credentials: "include" });
    if (!res.ok) throw new Error("Non connecté (étudiant)");
    me = await res.json();
  } catch (err) {
    console.error(err);
    alert("Veuillez vous connecter (étudiant).");
  }
}

function initSocket() {
  socket = io("http://localhost:5000", { withCredentials: true });

  socket.on("connect", () => {
    console.log("Socket connecté :", socket.id);
    if (me && me._id) socket.emit("joinRoom", me._id); // rejoindre SA room
  });

  socket.on("newMessage", (msg) => {
    // afficher seulement si le thread courant correspond
    if (!selectedAdminId) return;
    const related =
      (msg.sender && msg.sender._id === selectedAdminId) ||
      (msg.receiver && msg.receiver._id === selectedAdminId);
    if (related) appendMessage(msg);
  });
}

async function fetchAdmins() {
  try {
    const res = await fetch("http://localhost:5000/api/admin/list", { credentials: "include" });
    if (!res.ok) throw new Error("Erreur fetch admins");
    const admins = await res.json();

    adminList.innerHTML = "";
    admins.forEach((admin) => {
      const li = document.createElement("li");
      li.textContent = admin.fullname || admin.email;
      li.addEventListener("click", () => selectAdmin(admin));
      adminList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function selectAdmin(admin) {
  selectedAdminId = admin._id;
  chatTitle.textContent = admin.fullname || admin.email || "Administrateur";
  chatMessages.innerHTML = "";
  await fetchMessages();
}

async function fetchMessages() {
  if (!selectedAdminId) return;
  try {
    const res = await fetch(`http://localhost:5000/api/messages/student/thread/${selectedAdminId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erreur fetch messages");
    const messages = await res.json();
    if (!Array.isArray(messages)) return;
    messages.forEach(appendMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

function appendMessage(msg) {
  const fromSelf = msg.sender && me && msg.sender._id === me._id;
  const div = document.createElement("div");
  div.className = fromSelf ? "message self" : "message other";
const backendURL = "http://localhost:5000";
  div.innerHTML = `
  <div class="bubble">
    <div class="author">${msg.sender?.fullname ?? ""}</div>
    <div class="content">${escapeHtml(msg.content || "")}</div>
    ${msg.file ? `<div><a href="${backendURL}${msg.file}" target="_blank">[Fichier]</a></div>` : ""}
    <div class="time">${new Date(msg.createdAt).toLocaleString()}</div>
  </div>
`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  if (!selectedAdminId) return;
  const content = messageInput.value.trim();
  const file = fileInput.files[0];

  if (!content && !file) return;

  const formData = new FormData();
  formData.append("receiverId", selectedAdminId);
  if (content) formData.append("content", content);
  if (file) formData.append("file", file);

  try {
    const res = await fetch("http://localhost:5000/api/messages/student/send", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const msg = await res.json();
    if (res.ok) {
      appendMessage(msg); // affichage immédiat côté étudiant
      messageInput.value = "";
      fileInput.value = "";
    } else {
      console.error(msg);
      alert(msg?.error || "Erreur d'envoi");
    }
  } catch (err) {
    console.error(err);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
