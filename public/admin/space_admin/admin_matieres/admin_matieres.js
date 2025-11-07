let niveauActuel = null;

document.addEventListener("DOMContentLoaded", () => {
  const niveauButtons = document.querySelectorAll(".niveau-btn");
  const niveauDisplay = document.getElementById("niveauMatieres");

  const formMatiere = document.getElementById("formMatiere");
  const matiereIdInput = document.getElementById("matiereId");
  const matiereNomInput = document.getElementById("matiereNom");
  const matiereCoefInput = document.getElementById("matiereCoef");
  const matiereSemestreSelect = document.getElementById("matiereSemestre");
  const resetFormBtn = document.getElementById("resetFormMatiere");

  // Boutons niveaux
  niveauButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      niveauActuel = btn.dataset.niveau;

      // Afficher le niveau sélectionné
      niveauDisplay.textContent = niveauActuel;

      // Adapter les semestres selon le niveau
      chargerSemestresSelonNiveau(niveauActuel);

      // Charger les matières
      await chargerMatieres(niveauActuel);

      // Réinitialiser formulaire
      resetForm();
    });
  });

  // Vérification de session admin
(async function checkAdminSession() {
  try {
    const res = await fetch(`${API}/api/admin/check`, {
      credentials: "include"
    });
    const data = await res.json();

    if (!data.connected) {
      // Rediriger si non connecté
      window.location.href = "../../admin_connexion/admin_connexion.html";
    } else {
      console.log("✅ Admin connecté :", data.admin?.fullname || data.admin?.email);
    }
  } catch (err) {
    console.error("Erreur vérification session :", err);
    window.location.href = "../../admin_connexion/admin_connexion.html";
  }
})();

  // Gestion formulaire matière
  formMatiere.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = matiereNomInput.value.trim();
    const coefficient = parseFloat(matiereCoefInput.value);
    const semestre = matiereSemestreSelect.value;

    if (!nom || !coefficient || !semestre || !niveauActuel) {
      alert("Tous les champs sont requis.");
      return;
    }

    const id = matiereIdInput.value;

    try {
      if (id) {
        // Modifier matière
        const res = await fetch(`https://esmt-2025.onrender.com/api/matieres/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, coefficient, semestre }),
        });

        if (!res.ok) throw new Error("Erreur lors de la modification");
        alert("Matière modifiée avec succès");
      } else {
        // Ajouter nouvelle matière
        const res = await fetch(`https://esmt-2025.onrender.com/api/matieres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, coefficient, niveau: niveauActuel, semestre }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Erreur lors de l'ajout");
        }

        alert("Matière ajoutée avec succès");
      }

      resetForm();
      await chargerMatieres(niveauActuel);
    } catch (err) {
      alert(err.message);
    }
  });

  resetFormBtn.addEventListener("click", resetForm);

  function resetForm() {
    matiereIdInput.value = "";
    matiereNomInput.value = "";
    matiereCoefInput.value = "";
    matiereSemestreSelect.value = "";
  }

  // Menu mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });
});

// Charger les matières d’un niveau
async function chargerMatieres(niveau) {
  const tbody = document.getElementById("tableMatieres");
  tbody.innerHTML = "<tr><td colspan='4'>Chargement...</td></tr>";

  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/matieres/niveau/${niveau}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des matières");
    const matieres = await res.json();

    if (matieres.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4'>Aucune matière trouvée pour ce niveau.</td></tr>";
      return;
    }

    tbody.innerHTML = "";

    matieres.forEach((matiere) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${matiere.nom}</td>
        <td>${matiere.coefficient}</td>
        <td>${matiere.semestre}</td>
        <td>
          <button class="edit-btn" data-id="${matiere._id}" data-nom="${matiere.nom}" data-coefficient="${matiere.coefficient}" data-semestre="${matiere.semestre}">✏️</button>
          <button class="delete-btn" data-id="${matiere._id}">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    activerActionsMatieres();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='4'>Erreur lors du chargement : ${err.message}</td></tr>`;
  }
}

// Activer édition et suppression
function activerActionsMatieres() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("matiereId").value = btn.dataset.id;
      document.getElementById("matiereNom").value = btn.dataset.nom;
      document.getElementById("matiereCoef").value = btn.dataset.coefficient;
      document.getElementById("matiereSemestre").value = btn.dataset.semestre;

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Voulez-vous vraiment supprimer cette matière ?")) {
        try {
          const res = await fetch(`https://esmt-2025.onrender.com/api/matieres/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Erreur lors de la suppression");
          alert("Matière supprimée");
          await chargerMatieres(niveauActuel);
        } catch (err) {
          alert(err.message);
        }
      }
    });
  });
}

// Adapter le select semestre selon le niveau
function chargerSemestresSelonNiveau(niveau) {
  const matiereSemestreSelect = document.getElementById("matiereSemestre");
  matiereSemestreSelect.innerHTML = '<option value="">-- Choisir --</option>'; // reset

  let semestres = [];

  if (niveau === "Licence 1") semestres = ["Semestre 1", "Semestre 2"];
  else if (niveau === "Licence 2") semestres = ["Semestre 3", "Semestre 4"];
  else if (niveau === "Licence 3 - RT" || niveau === "Licence 3 - ASR") semestres = ["Semestre 5", "Semestre 6"];

  semestres.forEach(s => {
    const option = document.createElement("option");
    option.value = s;
    option.textContent = s;
    matiereSemestreSelect.appendChild(option);
  });
}

// Déconnexion admin
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const isAdminPage = window.location.pathname.includes("admin");
    const url = isAdminPage
      ? "https://esmt-2025.onrender.com/api/admin/logout"
      : "https://esmt-2025.onrender.com/api/etudiants/logout";

    const res = await fetch(url, {
      method: "POST",
      credentials: "include"
    });

    if (res.ok) {
      window.location.href = isAdminPage
        ? "../../admin_connexion/admin_connexion.html"
        : "/login.html";
    }
  } catch (err) {
    console.error("Erreur déconnexion :", err);
  }
});
