document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("table-notes");
  const semestreSelect = document.getElementById("trimestre-select");
  const niveauDisplay = document.getElementById("niveauEtudiant");
  const etudiantIdInput = document.getElementById("etudiantId");

  let etudiant = null;

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

    // Écoute du changement de semestre
    semestreSelect.addEventListener("change", () => {
      chargerNotes(etudiant.level, semestreSelect.value, etudiant._id);
    });

    // Chargement initial semestre sélectionné
    await chargerNotes(etudiant.level, semestreSelect.value, etudiant._id);

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

async function chargerNotes(niveau, semestreNumero, etudiantId) {
  const tableBody = document.getElementById("table-notes");
  tableBody.innerHTML = "<tr><td colspan='5'>Chargement...</td></tr>";

  // Transformer "1" ou "2" en "Semestre 1" / "Semestre 2"
  const semestreTexte = semestreNumero === "1" ? "Semestre 1" : "Semestre 2";

  try {
    // Récupérer matières du niveau + semestre
    const resMatieres = await fetch(`https://esmt-2025.onrender.com/api/matieres/niveau/${niveau}/semestre/${semestreTexte}`);
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

// Initialisation des modales
function initModales() {
  const modals = document.querySelectorAll(".modal");
  // S'assurer que toutes les modales sont cachées au chargement
  modals.forEach(modal => {
    modal.style.display = "none";
  });

  // Ouvrir modale au clic sur footer-link
  document.querySelectorAll(".footer-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // éviter un comportement par défaut si <a>
      const modalId = "modal-" + link.dataset.modal;
      const modal = document.getElementById(modalId);
      if (modal) modal.style.display = "flex";
    });
  });

  // Fermer modale au clic sur la croix
  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").style.display = "none";
    });
  });

  // Fermer modale en cliquant à l'extérieur
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });
}

// Déconnexion
 document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});