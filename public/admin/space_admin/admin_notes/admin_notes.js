let niveauActuel = null;

document.addEventListener("DOMContentLoaded", () => {
  const niveauButtons = document.querySelectorAll(".niveau-btn");
  const etudiantSelect = document.getElementById("etudiantSelect");
  const semestreSelect = document.getElementById("semestreSelect");
  const niveauDisplay = document.getElementById("niveauSelectionne");

  // Boutons niveaux
  niveauButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      niveauActuel = btn.dataset.niveau;

      // Afficher le niveau sélectionné
      niveauDisplay.textContent = `✅ Niveau sélectionné : ${niveauActuel}`;

      

      // Charger les matières et étudiants
      await chargerEtudiants(niveauActuel);

      // Réinitialiser sélection étudiant et notes
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
    
});



// Charger les étudiants d’un niveau dans le select
// Charger les étudiants d’un niveau dans le select
async function chargerEtudiants(niveau) {
  const etudiantSelect = document.getElementById("etudiantSelect");
  etudiantSelect.innerHTML = '<option value="">-- Choisir un étudiant --</option>';

  try {
    const res = await fetch(`http://localhost:5000/api/etudiants/${niveau}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des étudiants");
    const etudiants = await res.json();

    // ✅ Tri alphabétique par fullname (en tenant compte des accents)
    etudiants.sort((a, b) => {
      const nameA = (a.fullname || "").toLowerCase();
      const nameB = (b.fullname || "").toLowerCase();
      return nameA.localeCompare(nameB, "fr");
    });

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
    // Récupérer matières du niveau + semestre
    const resMatieres = await fetch(`http://localhost:5000/api/matieres/niveau/${niveau}/semestre/${semestre}`);
    if (!resMatieres.ok) throw new Error("Erreur lors du chargement des matières");
    const matieres = await resMatieres.json();

    // Récupérer notes de l'étudiant
    const resNotes = await fetch(`http://localhost:5000/api/notes/${etudiantId}`);
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
    tableBody.innerHTML = `<tr><td colspan="7">Erreur : ${err.message}</td></tr>`;
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
        const res = await fetch("http://localhost:5000/api/notes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
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

function addMessageBubble(m) {
  const div = document.createElement("div");
  div.classList.add("bubble");

  // Si le message est envoyé par l'admin
  if (m.senderModel === "Admin") {
    div.classList.add(isAdmin ? "sent" : "received");
    div.classList.add("admin");
  } 
  // Si le message est envoyé par l'étudiant
  else {
    div.classList.add(isAdmin ? "received" : "sent");
    div.classList.add("student");
  }

  div.textContent = m.content;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


// Menu mobile
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});