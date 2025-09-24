document.addEventListener("DOMContentLoaded", () => {
  const notificationBtn = document.getElementById("notificationBtn");
  const notificationCount = document.getElementById("notificationCount");
  const notificationDropdown = document.getElementById("notificationDropdown");
  const notificationList = document.getElementById("notificationList");
  const etudiantId = document.getElementById("etudiantId")?.value;

  notificationDropdown.style.display = "none";

  notificationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notificationDropdown.style.display =
      notificationDropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    notificationDropdown.style.display = "none";
  });

  function updateNotificationCount(count) {
    notificationCount.textContent = count;
    notificationCount.style.display = count > 0 ? "inline-block" : "none";
  }

  function getLienByType(type) {
    switch(type) {
      case "note": return "../Notes/notes.html";
      case "absence": return "../Absences/absences.html";
      case "emploi": return "../Calendrier/calendrier.html";
      case "message": return "../Messages/messages.html";
      default: return "../dashboard/dashboard_protected.html";
    }
  }

  function afficherNotifications(notifs) {
    notificationList.innerHTML = "";

    notifs.forEach((n) => {
      const item = document.createElement("li");
      item.classList.add("notification", n.isRead ? "lue" : "non-lue");
      item.textContent = n.message;

      item.addEventListener("click", async () => {
  try {
    const deleteUrl = n.type === "message"
      ? `https://esmt-2025.onrender.com/api/notifications/${n._id}`
      : `https://esmt-2025.onrender.com/api/notifOnlyStudent/${n._id}`;

    const res = await fetch(deleteUrl, { method: "DELETE", credentials: "include" });

    if (!res.ok) return;

    item.remove();
    updateNotificationCount(Math.max(0, parseInt(notificationCount.textContent) - 1));

    // 🚀 Forcer redirection pour type message
    let lien = n.lien;
    if (!lien) lien = getLienByType(n.type);

    if (lien) {
      setTimeout(() => {
        window.location.href = lien;
      }, 200);
    }
  } catch (err) {
    console.error("Erreur lors du clic notif:", err);
  }
});

      notificationList.prepend(item);
    });
  }

  async function fetchNotifications() {
    try {
      const resGeneral = await fetch("https://esmt-2025.onrender.com/api/notifOnlyStudent/me", { credentials: "include" });
      const notifsGeneral = await resGeneral.json();

      const resMessages = await fetch("https://esmt-2025.onrender.com/api/notifications/student", { credentials: "include" });
      const notifsMessages = (await resMessages.json()).map(msg => ({
        _id: msg._id,
        message: msg.message || "Nouveau message",
        type: "message",
        isRead: msg.isRead || false,
        lien: "../Messages/messages.html",
        createdAt: msg.createdAt
      }));

      const notifications = [...notifsGeneral, ...notifsMessages]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      afficherNotifications(notifications);
      updateNotificationCount(notifications.filter(n => !n.isRead).length);

    } catch (err) {
      console.error("Erreur récupération notifications:", err);
    }
  }

  fetchNotifications();

  if (typeof io !== "undefined" && etudiantId) {
    const socket = io("https://esmt-2025.onrender.com", { withCredentials: true });
    socket.emit("joinRoom", etudiantId);

    socket.on("newNotification", (notif) => {
      fetchNotifications();
      showToast(notif.texte || notif.message);
    });
  }
});
