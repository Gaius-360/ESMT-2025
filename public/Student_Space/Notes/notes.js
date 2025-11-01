document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("table-notes");
  const semestreSelect = document.getElementById("trimestre-select");
  const niveauDisplay = document.getElementById("niveauEtudiant");
  const etudiantIdInput = document.getElementById("etudiantId");

  let etudiant = null;

  // -------- Utils --------
  function getSemestresPourNiveau(niveau) {
    switch (niveau) {
      case "Licence 1": return ["Semestre 1", "Semestre 2"];
      case "Licence 2": return ["Semestre 3", "Semestre 4"];
      case "Licence 3 - RT":
      case "Licence 3 - ASR": return ["Semestre 5", "Semestre 6"];
      default: return ["Semestre 1", "Semestre 2"];
    }
  }

  function remplirSelectSemestres(niveau) {
    const semestres = getSemestresPourNiveau(niveau);
    semestreSelect.innerHTML = "";
    semestres.forEach((s, i) => {
      const option = document.createElement("option");
      option.value = i; // index pour garder simple (0,1)
      option.textContent = s;
      semestreSelect.appendChild(option);
    });
  }

  try {
    // Vérifier si étudiant connecté et récupérer ses infos
    const resCheck = await fetch("https://esmt-2025.onrender.com/api/etudiants/check", {
      credentials: "include"
    });
    const dataCheck = await resCheck.json();

    if (!dataCheck.connected) {
      alert("Vous devez vous connecter pour voir vos notes.");
      window.location.href = "../connexion/etudiant_connexion.html";
      return;
    }

    etudiant = dataCheck.user;
    etudiantIdInput.value = etudiant._id;
    niveauDisplay.textContent = `Niveau : ${etudiant.level}`;

    // Remplir le select semestre selon le niveau
    remplirSelectSemestres(etudiant.level);

    // Charger notes initiales pour le premier semestre
    await chargerNotes(etudiant.level, semestreSelect.selectedIndex, etudiant._id);

    // Écoute du changement de semestre
    semestreSelect.addEventListener("change", () => {
      chargerNotes(etudiant.level, semestreSelect.selectedIndex, etudiant._id);
    });

  } catch (err) {
    console.error("Erreur session :", err);
    alert("Erreur lors de la vérification de session.");
  }

  // Gestion modales footer
  initModales();

  // Menu mobile
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
});

// -------- Charger notes --------
async function chargerNotes(niveau, semestreIndex, etudiantId) {
  const tableBody = document.getElementById("table-notes");
  tableBody.innerHTML = "<tr><td colspan='5'>Chargement...</td></tr>";

  const semestres = {
    "Licence 1": ["Semestre 1", "Semestre 2"],
    "Licence 2": ["Semestre 3", "Semestre 4"],
    "Licence 3 - RT": ["Semestre 5", "Semestre 6"],
    "Licence 3 - ASR": ["Semestre 5", "Semestre 6"]
  };

  const semestreTexte = semestres[niveau]?.[semestreIndex] || "Semestre 1";

  try {
    // Récupérer matières du niveau + semestre
    const resMatieres = await fetch(`https://esmt-2025.onrender.com/api/matieres/niveau/${encodeURIComponent(niveau)}/semestre/${encodeURIComponent(semestreTexte)}`);
    if (!resMatieres.ok) throw new Error("Erreur lors du chargement des matières");
    const matieres = await resMatieres.json();

    // Récupérer notes de l'étudiant
    const resNotes = await fetch(`https://esmt-2025.onrender.com/api/notes/${etudiantId}`);
    if (!resNotes.ok) throw new Error("Erreur lors du chargement des notes");
    const notesExistantes = await resNotes.json();

    if (matieres.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='5'>Aucune matière trouvée pour ce semestre.</td></tr>";
      return;
    }

    tableBody.innerHTML = "";

    matieres.forEach(matiere => {
      const noteTrouvee = notesExistantes.find(
        note => note.matiere === matiere.nom && note.semestre === matiere.semestre
      );

      const note1 = noteTrouvee?.note1 ?? "❌";
      const note2 = noteTrouvee?.note2 ?? "❌";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${matiere.nom}</td>
        <td>${note1}</td>
        <td>${note2}</td>
        <td>${matiere.coefficient}</td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan='5'>Erreur : ${err.message}</td></tr>`;
  }
}

// -------- Modales footer --------
function initModales() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach(modal => { modal.style.display = "none"; });

  document.querySelectorAll(".footer-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const modalId = "modal-" + link.dataset.modal;
      const modal = document.getElementById(modalId);
      if (modal) modal.style.display = "flex";
    });
  });

  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").style.display = "none";
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) e.target.style.display = "none";
  });
}

// -------- Déconnexion --------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", {
      method: "POST",
      credentials: "include"
    });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) {
    console.error("Erreur déconnexion :", err);
  }
});


async function registerPush() {
if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
console.log('Push non supporté');
return;
}


try {
const registration = await navigator.serviceWorker.register('/sw.js');
const permission = await Notification.requestPermission();
if (permission !== 'granted') return;


const vapidPublicKey = 'BFAgfeacAeGdQxHsp5PVTTMXunTRoE9PwU6thjb1p2ZDit-1HUY_eJpU-xZii8VH8O5kiua7hEs5xPq0Civqnw8';
const subscription = await registration.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
});


// envoyer au backend
await fetch('https://esmt-2025.onrender.com/api/push/subscribe', {
method: 'POST',
credentials: 'include',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(subscription)
});


console.log('Abonnement push OK');
} catch (err) {
console.error('Erreur registerPush', err);
}
}


function urlBase64ToUint8Array(base64String) {
const padding = '='.repeat((4 - base64String.length % 4) % 4);
const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
const rawData = atob(base64);
return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


// Auto-register
registerPush();