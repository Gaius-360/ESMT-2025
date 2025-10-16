let niveauActuel = null;

document.addEventListener("DOMContentLoaded", () => {
  const niveauButtons = document.querySelectorAll(".niveau-btn");
  const etudiantSelect = document.getElementById("etudiantSelect");
  const semestreSelect = document.getElementById("semestreSelect");
  const niveauDisplay = document.getElementById("niveauSelectionne");

  // Mapping niveaux → semestres
  const semestresParNiveau = {
    "Licence 1": ["Semestre 1", "Semestre 2"],
    "Licence 2": ["Semestre 3", "Semestre 4"],
    "Licence 3 - RT": ["Semestre 5", "Semestre 6"],
    "Licence 3 - ASR": ["Semestre 5", "Semestre 6"],
  };

  // Boutons niveaux
  niveauButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      niveauActuel = btn.dataset.niveau;

      // Afficher le niveau sélectionné
      niveauDisplay.textContent = `✅ Niveau sélectionné : ${niveauActuel}`;

      // Adapter le select des semestres
      remplirSemestres(niveauActuel);

      // Charger les étudiants
      await chargerEtudiants(niveauActuel);

      // Réinitialiser sélection étudiant et tableau des notes
      etudiantSelect.value = "";
      document.getElementById("notesBody").innerHTML = "";
    });
  });

  // Changement étudiant ou semestre déclenche affichage des notes
  etudiantSelect.addEventListener("change", () => {
    const etudiantId = etudiantSelect.value;
    const semestre = semestreSelect.value;
    if (etudiantId) {
      chargerMatieresPourEtudiant(niveauActuel, semestre, etudiantId);
    } else {
      document.getElementById("notesBody").innerHTML = "";
    }
  });

  semestreSelect.addEventListener("change", () => {
    const etudiantId = etudiantSelect.value;
    const semestre = semestreSelect.value;
    if (etudiantId) {
      chargerMatieresPourEtudiant(niveauActuel, semestre, etudiantId);
    } else {
      document.getElementById("notesBody").innerHTML = "";
    }
  });

  // Menu mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

  // Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      const isAdminPage = window.location.pathname.includes("admin");
      const url = isAdminPage
        ? "https://esmt-2025.onrender.com/api/admin/logout"
        : "https://esmt-2025.onrender.com/api/etudiants/logout";

      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (res.ok) {
        window.location.href = isAdminPage
          ? "/backend/public/admin/admin_connexion/admin_connexion.html"
          : "/login.html";
      }
    } catch (err) {
      console.error("Erreur déconnexion :", err);
    }
  });

  // Fonction pour remplir le select semestre selon le niveau
  function remplirSemestres(niveau) {
    semestreSelect.innerHTML = '<option value="">-- Choisir un semestre --</option>';
    if (niveau && semestresParNiveau[niveau]) {
      semestresParNiveau[niveau].forEach((s) => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        semestreSelect.appendChild(option);
      });
    }
  }
});

// ------------------------- Fonctions auxiliaires -------------------------

// Charger les étudiants d’un niveau dans le select
async function chargerEtudiants(niveau) {
  const etudiantSelect = document.getElementById("etudiantSelect");
  etudiantSelect.innerHTML = '<option value="">-- Choisir un étudiant --</option>';

  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/etudiants/niveau/${encodeURIComponent(niveau)}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des étudiants");
    const etudiants = await res.json();

    // Tri alphabétique par fullname
    etudiants.sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "fr"));

    etudiants.forEach((etudiant) => {
      const option = document.createElement("option");
      option.value = etudiant._id;
      option.textContent = etudiant.fullname;
      etudiantSelect.appendChild(option);
    });
  } catch (err) {
    alert(err.message);
  }
}

// Charger les matières + notes pour un étudiant et semestre donné
async function chargerMatieresPourEtudiant(niveau, semestre, etudiantId) {
  const tableBody = document.getElementById("notesBody");
  tableBody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";

  try {
    // Matières du niveau + semestre
    const resMatieres = await fetch(`https://esmt-2025.onrender.com/api/matieres/niveau/${niveau}/semestre/${semestre}`);
    if (!resMatieres.ok) throw new Error("Erreur lors du chargement des matières");
    const matieres = await resMatieres.json();

    // Notes de l'étudiant
    const resNotes = await fetch(`https://esmt-2025.onrender.com/api/notes/${etudiantId}`);
    if (!resNotes.ok) throw new Error("Erreur lors du chargement des notes");
    const notesExistantes = await resNotes.json();

    if (matieres.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='7'>Aucune matière trouvée pour ce semestre.</td></tr>";
      return;
    }

    tableBody.innerHTML = "";

    matieres.forEach((matiere) => {
      const noteTrouvee = notesExistantes.find(
        (note) => note.matiere === matiere.nom && note.semestre === matiere.semestre
      );

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${matiere.nom}</td>
        <td>${matiere.coefficient}</td>
        <td><input type="number" step="0.01" value="${noteTrouvee?.note1 ?? ""}" data-field="note1"></td>
        <td><input type="number" step="0.01" value="${noteTrouvee?.note2 ?? ""}" data-field="note2"></td>
        <td>${matiere.semestre}</td>
        <td>
          <button class="btn-enregistrer" data-matiere="${matiere.nom}" data-semestre="${matiere.semestre}" data-coefficient="${matiere.coefficient}">💾</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    activerEnregistrement(etudiantId);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan='7'>Erreur : ${err.message}</td></tr>`;
  }
}

// Activer le bouton d’enregistrement des notes pour chaque ligne
function activerEnregistrement(etudiantId) {
  document.querySelectorAll(".btn-enregistrer").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const matiere = btn.dataset.matiere;
      const semestre = btn.dataset.semestre;
      const coefficient = parseFloat(btn.dataset.coefficient);

      const inputs = row.querySelectorAll("input");
      const note1 = inputs[0].value.trim() !== "❌" ? parseFloat(inputs[0].value) : null;
      const note2 = inputs[1].value.trim() !== "❌" ? parseFloat(inputs[1].value) : null;

      try {
        const res = await fetch("https://esmt-2025.onrender.com/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            etudiantId,
            matiere,
            coefficient,
            niveau: niveauActuel,
            semestre,
            note1,
            note2,
          }),
        });

        if (!res.ok) throw new Error("Erreur lors de l’enregistrement");
        alert("Note enregistrée !");
      } catch (err) {
        alert("Échec de l’enregistrement : " + err.message);
      }
    });
  });
}
