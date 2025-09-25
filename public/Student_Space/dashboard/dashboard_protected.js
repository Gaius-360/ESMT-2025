document.addEventListener("DOMContentLoaded", async () => {


  // 1️⃣ Vérification de connexion étudiant
  let etudiantId;
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/check", {
      method: "GET",
      credentials: "include"
    });
    const data = await res.json();

    if (!data.connected) {
      window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
      return;
    }

    // Étudiant connecté
    console.log("Étudiant connecté :", data.user.fullname);
    etudiantId = data.user._id; // ✅ Récupération de l'ID étudiant
  } catch (error) {
    console.error("Erreur de vérification connexion :", error);
    window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
    return;
  }

  

  // 3️⃣ Fonction pour charger les 4 dernières notes
  async function chargerDernieresNotes() {
    try {
      const res = await fetch(`https://esmt-2025.onrender.com/api/notes/${etudiantId}/recentes`);
      const notes = await res.json();

      const liste = document.getElementById("dernieres-notes-list");
      liste.innerHTML = "";

      if (!Array.isArray(notes) || notes.length === 0) {
        liste.innerHTML = "<li>Aucune note disponible</li>";
        return;
      }

      // On garde au maximum 4 dernières notes
      notes.slice(0, 4).forEach(note => {
        const li = document.createElement("li");
        li.textContent = `${note.matiere} | Coef: ${note.coefficient} | Note: ${note.note}`;
        liste.appendChild(li);
      });
    } catch (err) {
      console.error("Erreur chargement notes:", err);
    }
  }

  // Chargement initial des dernières notes
  chargerDernieresNotes();


  // 4️⃣ Fonction pour charger les 4 dernières absences
async function chargerDernieresAbsences() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/absences/me/recentes", {
      credentials: "include"
    });
    const absences = await res.json();

    const liste = document.getElementById("dernieres-absences-list");
    liste.innerHTML = "";

    if (!Array.isArray(absences) || absences.length === 0) {
      liste.innerHTML = "<li>Aucune absence</li>";
      return;
    }

    absences.forEach(abs => {
      const li = document.createElement("li");
      li.textContent = `${abs.niveau} | ${abs.semestre} | Date: ${new Date(abs.dateAbsence).toLocaleDateString()} | Statut: ${abs.statut}`;
      liste.appendChild(li);
    });
  } catch (err) {
    console.error("Erreur chargement absences:", err);
  }
}

// Chargement initial des absences
chargerDernieresAbsences();

 
});

// Gestion ouverture/fermeture modales
document.querySelectorAll(".footer-link").forEach(link => {
  link.addEventListener("click", () => {
    const modalId = "modal-" + link.dataset.modal;
    document.getElementById(modalId).style.display = "flex";
  });
});

document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.closest(".modal").style.display = "none";
  });
});

// Fermer en cliquant à l'extérieur
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

// Menu mobile
  document.querySelector(".mobile-menu-btn").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});
