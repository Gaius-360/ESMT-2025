const MONTANTS_PAR_NIVEAU = {
  "Licence 1": [305000, 100000, 100000, 100000],
  "Licence 2": [305000, 100000, 100000, 100000],
  "Licence 3 - RT": [405000, 100000, 100000, 100000],
  "Licence 3 - ASR": [405000, 100000, 100000, 100000]
};

let allPaiements = [];
let allEtudiants = [];
let currentNiveau = "";

const niveauSelect = document.getElementById("niveauSelect");
const etudiantSelect = document.getElementById("etudiantSelect");
const searchInput = document.getElementById("searchInput");
const tbody = document.querySelector("#tablePaiements tbody");
const bilanDiv = document.getElementById("bilan");
const createPaiement = document.getElementById("createPaiement");
const btnCreateAllPaiements = document.getElementById("btnCreateAllPaiements");

// Événements
niveauSelect.addEventListener("change", async () => {
  currentNiveau = niveauSelect.value;
  await loadEtudiants(currentNiveau);
  await loadPaiements();
  displayTable();
});

etudiantSelect.addEventListener("change", displayTable);
searchInput.addEventListener("input", displayTable);

createPaiement.addEventListener("click", async () => {
  const etuId = etudiantSelect.value;
  if (!currentNiveau || !etuId) return alert("Choisir niveau et étudiant.");
  await createPaiement(etuId, currentNiveau);
});

btnCreateAllPaiements.addEventListener("click", async () => {
  if (!currentNiveau) return alert("Sélectionnez d'abord un niveau.");
  if (!confirm(`Créer la situation pour tous les étudiants de ${currentNiveau} ?`)) return;

  const anneeAcademique = new Date().getFullYear() + "/" + (new Date().getFullYear() + 1);

  for (let etu of allEtudiants.filter(e => e.level === currentNiveau)) {
    try {
      const res = await fetch(`http://localhost:5000/api/paiements/create/${etu._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niveau: currentNiveau, anneeAcademique }),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) console.warn(`Erreur pour ${etu.fullname}: ${data.message}`);
    } catch (err) {
      console.error(err);
    }
  }

  alert("Toutes les situations ont été traitées.");
  await loadPaiements();
});

// Charger les étudiants d'un niveau
async function loadEtudiants(niveau) {
  etudiantSelect.innerHTML = `<option value="">Chargement...</option>`;
  if (!niveau) {
    etudiantSelect.innerHTML = `<option value="">-- tous --</option>`;
    allEtudiants = [];
    return;
  }
  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/etudiants?niveau=${encodeURIComponent(niveau)}`, { credentials: "include" });
    allEtudiants = await res.json();
    etudiantSelect.innerHTML = `<option value="">-- tous --</option>` +
      allEtudiants.map(e => `<option value="${e._id}">${e.fullname}</option>`).join("");
  } catch (err) {
    console.error(err);
    etudiantSelect.innerHTML = `<option value="">Erreur</option>`;
    allEtudiants = [];
  }
}

// Charger paiements
async function loadPaiements() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/paiements/all", { credentials: "include" });
    allPaiements = await res.json();
    await loadStats();
    displayTable();
  } catch (err) {
    console.error(err);
  }
}

// Statistiques
async function loadStats() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/paiements/stats", { credentials: "include" });
    const stats = await res.json();
    const s = stats[currentNiveau] || { total:0, totalPaye:0, partiel:0, nonPaye:0, montantTotal:0, montantRestant:0 };
    bilanDiv.innerHTML = `
      <strong>${currentNiveau || "Tous niveaux"}</strong> — 
      total: <b>${s.total}</b> | 
      payés: <b style="color:green">${s.totalPaye}</b> | 
      partiels: <b style="color:orange">${s.partiel}</b> | 
      non payés: <b style="color:red">${s.nonPaye}</b> | 
      encaissé: <b>${(s.montantTotal||0).toLocaleString()} F</b> | 
      reste: <b>${(s.montantRestant||0).toLocaleString()} F</b>
    `;
  } catch (err) {
    console.error(err);
    bilanDiv.textContent = "Erreur chargement bilan.";
  }
}

// Construire et afficher le tableau
function displayTable() {
  tbody.innerHTML = "";
  if (!currentNiveau) {
    tbody.innerHTML = `<tr><td colspan="9">Sélectionne un niveau pour gérer les situations.</td></tr>`;
    return;
  }

  // Filtrer les étudiants du niveau sélectionné
  let list = allEtudiants.filter(e => e.level === currentNiveau);

  // 🔍 Recherche insensible à la casse
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    list = list.filter(e => {
      const nom = (e.fullname || "").toLowerCase();
      const email = (e.email || "").toLowerCase();
      return nom.includes(q) || email.includes(q);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">Aucun étudiant trouvé.</td></tr>`;
    return;
  }

  list.forEach(etu => {
    const p = allPaiements.find(x => x.etudiant && String(x.etudiant._id) === String(etu._id));
    const montants = MONTANTS_PAR_NIVEAU[currentNiveau] || [0,0,0,0];

    const tr = document.createElement("tr");
    let versementCells = "";
    let dateCells = "";
    for (let i = 0; i < 4; i++) {
      const versement = p?.versements?.[i];
      const checked = versement?.status === "payé";
      const date = versement?.datePaiement ? new Date(versement.datePaiement).toISOString().split("T")[0] : "";

      versementCells += `<td><input type="checkbox" data-stu="${etu._id}" data-num="${i + 1}" ${checked ? "checked" : ""}></td>`;
      dateCells += `<td><input type="date" data-date="${etu._id}-${i + 1}" value="${date}" ${checked ? "" : "disabled"}></td>`;
    }

    const totalPaye = p ? (p.totalPaye || 0) : 0;
    const reste = p ? (p.resteAPayer || montants.reduce((a, b) => a + b, 0)) : montants.reduce((a, b) => a + b, 0);

    const actions = p
      ? `
        <button class="btn" onclick="savePaiement('${etu._id}')">Enregistrer</button>
        <button class="btn secondary" onclick="deletePaiement('${etu._id}')">Supprimer</button>
      `
      : `<button class="btn" onclick="createPaiement('${etu._id}', '${currentNiveau}')">Créer</button>`;

    tr.innerHTML = `
      <td style="text-align:left">${etu.fullname}<br/><small>${etu.email || ''}</small></td>
      ${versementCells}
      ${dateCells}
      <td id="tp-${etu._id}"><b>${totalPaye.toLocaleString()} F</b></td>
      <td id="r-${etu._id}"><b>${reste.toLocaleString()} F</b></td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);

    const checkboxes = tr.querySelectorAll(`input[type="checkbox"][data-stu="${etu._id}"]`);
    checkboxes.forEach(cb => cb.addEventListener("change", () => toggleDateInput(etu._id, cb)));
  });
}


function toggleDateInput(etudiantId, cb) {
  const num = cb.getAttribute("data-num");
  const dateInput = document.querySelector(`input[data-date="${etudiantId}-${num}"]`);
  if (cb.checked) dateInput.disabled = false;
  else {
    dateInput.disabled = true;
    dateInput.value = "";
  }
  updateRowTotals(etudiantId);
}

function updateRowTotals(etudiantId) {
  const montants = MONTANTS_PAR_NIVEAU[currentNiveau] || [0,0,0,0];
  const checks = document.querySelectorAll(`input[type="checkbox"][data-stu="${etudiantId}"]`);
  let total = 0;
  checks.forEach(cb => {
    const num = parseInt(cb.getAttribute("data-num"),10);
    if (cb.checked) total += montants[num-1] || 0;
  });
  const montantTotal = montants.reduce((a,b)=>a+b,0);
  document.getElementById(`tp-${etudiantId}`).innerHTML = `<b>${total.toLocaleString()} F</b>`;
  document.getElementById(`r-${etudiantId}`).innerHTML = `<b>${(montantTotal - total).toLocaleString()} F</b>`;
}

async function savePaiement(etudiantId) {
  const checks = document.querySelectorAll(`input[type="checkbox"][data-stu="${etudiantId}"]`);
  const versements = Array.from(checks).map(cb => {
    const num = parseInt(cb.getAttribute("data-num"),10);
    const dateInput = document.querySelector(`input[data-date="${etudiantId}-${num}"]`);
    return {
      numero: num,
      status: cb.checked ? "payé" : "non payé",
      datePaiement: dateInput.value || null
    };
  });

  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/paiements/update/${etudiantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versements }),
      credentials: "include"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur sauvegarde");
    alert(data.message || "Mise à jour réussie");
    await loadPaiements();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erreur");
  }
}

// Initialisation
(async function init() {
  await loadPaiements();
})();
