const API = "https://esmt-2025.onrender.com";

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
const deleteBtn = document.getElementById("deleteSelectedBtn");

// === UTILITAIRES ===
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>'"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" }[c]));
}
function debounce(fn, delay=300){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAdminSession();
  initSocket();
  initStudentSearch();
  initLevelSelection();
  initNotificationUI();
  initDeleteButton();
});

// === SESSION ADMIN ===
async function fetchAdminSession() {
  try {
    const res = await fetch(`${API}/api/admin/check`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    admin = data.connected ? data.admin : null;
  } catch(err) { console.error("Erreur récupération session admin :", err); admin = null; }
}

// === SOCKET.IO ===
function initSocket() {
  socket = io(API, { withCredentials: true });
  socket.on("connect", () => {
    if(admin && admin._id) socket.emit("joinRoom", admin._id);
  });
  socket.on("newMessage", (msg) => {
    notifications.unshift(msg);
    updateNotificationUI();
    if(selectedTarget && targetType==="student") {
      const id = selectedTarget.toString();
      const sId = (msg.sender?._id || msg.sender)?.toString();
      const rId = (msg.receiver?._id || msg.receiver)?.toString();
      if(sId===id || rId===id) addMessageToChat(msg);
    }
  });
  socket.on("deleteMessage", ({ messageId }) => {
    const div = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
    if(div) div.remove();
    updateDeleteButtonVisibility();
  });
}

// === NOTIFICATIONS ===
function initNotificationUI() {
  if(!notifBell || !notifMenu) return;
  notifBell.addEventListener("click", (e)=>{
    notifMenu.style.display = notifMenu.style.display==="block" ? "none" : "block";
    e.stopPropagation();
  });
  document.addEventListener("click", ()=>{ if(notifMenu) notifMenu.style.display="none"; });
  fetchNotifications();
}
async function fetchNotifications() {
  try {
    const res = await fetch(`${API}/api/notifications/admin`, { credentials:"include" });
    if(!res.ok) return;
    notifications = await res.json();
    updateNotificationUI();
  } catch(err){ console.error(err); }
}
function updateNotificationUI() {
  if(!notifBadge || !notifMenu) return;
  const unreadCount = notifications.filter(n=>!n.isRead).length;
  notifBadge.textContent = unreadCount>0 ? unreadCount : "";
  notifBadge.style.display = unreadCount>0 ? "inline-block" : "none";
  const list = document.getElementById("notifList");
  if(!list) return;
  list.innerHTML="";
  if(!notifications.length) return list.innerHTML="<li>Aucune notification</li>";
  notifications.slice(0,10).forEach(n=>{
    const li = document.createElement("li");
    li.textContent = `${n.sender?.fullname || "?"}: ${n.message || n.content || "[Fichier]"}`;
    if(!n.isRead) li.classList.add("unread");
    li.addEventListener("click", async ()=>{
      if(n.sender?._id) openChatWith(n.sender._id);
      await markAsReadBySender(n.sender?._id);
    });
    list.appendChild(li);
  });
}
async function markAsReadBySender(senderId) {
  try{
    if(!senderId) return;
    const senderNotifs = notifications.filter(n=>n.sender?._id===senderId && !n.isRead);
    for(const n of senderNotifs){
      await fetch(`${API}/api/notifications/${n._id}/read`, { method:"PATCH", credentials:"include" });
      n.isRead=true;
    }
    updateNotificationUI();
  }catch(err){ console.error(err); }
}

// === RECHERCHE ETUDIANTS ===
function initStudentSearch() {
  renderHint();
  const runSearch = debounce(async ()=>{
    const query = studentSearch.value.trim();
    if(!query || query.length<2) return renderHint();
    try{
      const res = await fetch(`${API}/api/etudiants/search?q=${encodeURIComponent(query)}`, { credentials:"include" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const students = await res.json();
      if(!students.length) return renderNoResults();
      studentList.innerHTML = students.map(s => `<li data-id="${s._id}" data-fullname="${escapeHtml(s.fullname||s.email)}" class="name-search">${escapeHtml(s.fullname||s.email)} <small>(${escapeHtml(s.level||"N/A")})</small></li>`).join("");
      document.querySelectorAll("#studentList li").forEach(li => li.addEventListener("click", ()=>selectStudent({_id:li.dataset.id, fullname:li.dataset.fullname})));
    }catch(err){ console.error(err); studentList.innerHTML=`<li class="error">Erreur de recherche</li>`; }
  },350);
  studentSearch.addEventListener("input", runSearch);
}
function renderHint(){ studentList.innerHTML=`<li class="hint">Tapez au moins 2 caractères pour rechercher</li>`; }
function renderNoResults(){ studentList.innerHTML=`<li class="muted">Aucun étudiant trouvé</li>`; }
function selectStudent(student){
  selectedTarget=student._id; targetType="student"; chatTitle.textContent=student.fullname||"Conversation";
  highlightSelection(student._id);
  chatMessages.innerHTML="";
  fetchMessages(student._id);
}
function highlightSelection(id){
  document.querySelectorAll("#studentList li").forEach(li=>li.classList.toggle("selected", li.dataset.id===id));
  document.querySelectorAll("#levelList li").forEach(li=>li.classList.remove("selected"));
}

// === SELECTION NIVEAU ===
function initLevelSelection() {
  levelList.querySelectorAll("li").forEach(li=>li.addEventListener("click", ()=>selectLevel(li.dataset.level)));
}
function selectLevel(level){
  selectedTarget=level; targetType="level"; chatTitle.textContent=`Niveau : ${level}`;
  document.querySelectorAll("#levelList li").forEach(li=>li.classList.toggle("selected", li.dataset.level===level));
  document.querySelectorAll("#studentList li").forEach(li=>li.classList.remove("selected"));
  chatMessages.innerHTML="";
  fetchMessagesForLevel(level);
}
async function fetchMessagesForLevel(level){
  try{
    const res = await fetch(`${API}/api/messages/admin/thread/level/${encodeURIComponent(level)}`, { credentials:"include" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const messages = await res.json();
    chatMessages.innerHTML="";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop=chatMessages.scrollHeight;
  }catch(err){ console.error(err); chatMessages.innerHTML=`<div class="message"><div class="bubble">Impossible de charger les messages pour ce niveau.</div></div>`; }
}

// === MESSAGES ===
async function fetchMessages(studentId){
  try{
    const res = await fetch(`${API}/api/messages/admin/thread/${studentId}`, { credentials:"include" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const messages = await res.json();
    chatMessages.innerHTML="";
    messages.forEach(addMessageToChat);
    chatMessages.scrollTop=chatMessages.scrollHeight;
    updateDeleteButtonVisibility();
  }catch(err){ console.error(err); chatMessages.innerHTML=`<div class="message"><div class="bubble">Impossible de charger les messages.</div></div>`; updateDeleteButtonVisibility(); }
}

function addMessageToChat(msg){
  const sender = msg.sender || {};
  const fromSelf = admin && (sender._id===admin._id || sender._id===admin?._id);

  const div = document.createElement("div");
  div.className = fromSelf ? "message admin" : "message student";
  div.dataset.messageId = msg._id;

  const content = escapeHtml(msg.content||"");
  const fileLink = msg.file ? `<div><a href="${API}${msg.file}" target="_blank">[Fichier]</a></div>` : "";
  const author = escapeHtml(sender.fullname||"");
  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "";

  div.innerHTML = `
    <input type="checkbox" class="msg-select" style="display:none;">
    <div class="bubble">
      <div class="author">${author}</div>
      <div class="content">${content}</div>
      ${fileLink}
      <div class="time">${time}</div>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  updateDeleteButtonVisibility();
}

// === BOUTON SUPPRESSION MESSAGES ===
function initDeleteButton(){
  updateDeleteButtonVisibility();
  deleteBtn.addEventListener("click", async ()=>{
    const state = deleteBtn.dataset.state || "init";
    if(state==="init"){
      // passer en mode sélection
      chatMessages.querySelectorAll(".msg-select").forEach(cb=>cb.style.display="inline-block");
      deleteBtn.textContent = "Supprimer les messages sélectionnés";
      deleteBtn.dataset.state="select";
    } else if(state==="select"){
      const selected = [...chatMessages.querySelectorAll(".msg-select:checked")].map(cb=>cb.closest(".message").dataset.messageId);
      if(!selected.length) return alert("Sélectionnez au moins un message.");
      if(!confirm(`Voulez-vous supprimer ${selected.length} message(s) définitivement ?`)) return;
      for(const id of selected){
        try{
          const res = await fetch(`${API}/api/messages/admin/message/${id}`, { method:"DELETE", credentials:"include" });
          const data = await res.json();
          if(!res.ok) alert(data.error || "Erreur suppression message");
          else { const div = chatMessages.querySelector(`[data-message-id="${id}"]`); if(div) div.remove(); }
        }catch(err){ console.error(err); alert("Erreur lors de la suppression d'un message"); }
      }
      // reset mode
      chatMessages.querySelectorAll(".msg-select").forEach(cb=>cb.style.display="none"); cb.checked=false;
      deleteBtn.textContent="Suppression de un ou plusieurs messages";
      deleteBtn.dataset.state="init";
      updateDeleteButtonVisibility();
    }
  });
}
function updateDeleteButtonVisibility(){
  if(!deleteBtn) return;
  if(chatMessages.children.length===0) deleteBtn.style.display="none";
  else deleteBtn.style.display="block";
}

// === ENVOI MESSAGE ===
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); }});
async function sendMessage(){
  if(!selectedTarget) return alert("Sélectionnez un étudiant ou un niveau.");
  const content = messageInput.value.trim();
  const file = fileInput.files[0];
  if(!content && !file) return;
  const formData = new FormData();
  if(targetType==="student") formData.append("receiverId", selectedTarget);
  else if(targetType==="level") formData.append("level", selectedTarget);
  if(content) formData.append("content", content);
  if(file) formData.append("file", file);
  try{
    const url = targetType==="student"?`${API}/api/messages/admin/send`:`${API}/api/messages/admin/send/level`;
    const res = await fetch(url, { method:"POST", body:formData, credentials:"include" });
    const msg = await res.json();
    if(!res.ok) return alert(msg?.error || "Erreur d’envoi.");
    if(targetType==="student") addMessageToChat(msg);
    else {
      const fakeMsg = { sender:admin, content:content||"[Fichier]", createdAt:new Date(), file:file?URL.createObjectURL(file):null };
      addMessageToChat(fakeMsg);
      alert(`Message envoyé à ${msg.count||0} étudiant(s) de ${selectedTarget}`);
    }
    messageInput.value=""; fileInput.value="";
  }catch(err){ console.error(err); alert("Erreur lors de l'envoi du message."); }
}

// --- OUVRIR CHAT (notification click) ---
function openChatWith(studentId){
  selectedTarget = studentId; targetType="student";
  const li = document.querySelector(`#studentList li[data-id="${studentId}"]`);
  const fullname = li ? li.dataset.fullname : "Conversation";
  chatTitle.textContent = fullname;
  highlightSelection(studentId);
  fetchMessages(studentId);
}

// --- SIDEBAR TOGGLE ---
const sidebar = document.querySelector('.sidebar');
const chat = document.querySelector('.chat');
const toggleBtn = document.getElementById('sidebarToggle');
if(toggleBtn){
  toggleBtn.addEventListener('click', ()=>{
    if(window.innerWidth>768){
      sidebar.classList.toggle('collapsed');
      chat.classList.toggle('fullwidth');
    }else{
      sidebar.classList.toggle('open');
    }
  });
}
