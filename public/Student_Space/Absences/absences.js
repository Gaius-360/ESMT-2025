const API = "https://esmt-2025.onrender.com";
const el = (id) => document.getElementById(id);

const semestreSelect = el("semestreSelect");
const tbodyAbsences = el("tbodyAbsences");
const erreurEl = el("erreur");

// -------- Utils --------
function showError(msg) {
  erreurEl.textContent = msg;
  erreurEl.style.display = "block";
}

function clearError() {
  erreurEl.textContent = "";
  erreurEl.style.display = "none";
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function badge(statut) {
  if (!statut) return `<span class="badge ko">Non justifié</span>`;
  return statut.toLowerCase() === "justifié"
    ? `<span class="badge ok">Justifié</span>`
    : `<span class="badge ko">Non justifié</span>`;
}

// Calcul durée en heures
function calcDuree(hDebut, hFin) {
  if (!hDebut || !hFin) return "—";
  const [h1, m1] = hDebut.split(":").map(Number);
  const [h2, m2] = hFin.split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return "—";
  const duree = (h2 + m2 / 60) - (h1 + m1 / 60);
  return duree >= 0 ? duree.toFixed(2) : "—";
}

// -------- Déterminer semestres selon niveau --------
function getSemestresPourNiveau(niveau) {
  switch (niveau) {
    case "Licence 1": return ["Semestre 1", "Semestre 2"];
    case "Licence 2": return ["Semestre 3", "Semestre 4"];
    case "Licence 3 - RT":
    case "Licence 3 - ASR": return ["Semestre 5", "Semestre 6"];
    default: return ["Semestre 1", "Semestre 2"];
  }
}

// -------- Charger les semestres dynamiquement --------
async function loadSemestres() {
  try {
    const res = await fetch(`${API}/api/etudiants/me`, { credentials: "include" });
    if (!res.ok) throw new Error("Impossible de récupérer les infos étudiant");
    const etudiant = await res.json();
    const semestres = getSemestresPourNiveau(etudiant.level);

    semestreSelect.innerHTML = "";
    semestres.forEach(s => {
      const option = document.createElement("option");
      option.value = s;
      option.textContent = s;
      semestreSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur loadSemestres:", err);
    showError(err.message || "Erreur lors du chargement des semestres");
  }
}

// -------- Charger absences --------
async function loadMesAbsences() {
  clearError();
  tbodyAbsences.innerHTML = `<tr><td colspan="7">Chargement…</td></tr>`;

  try {
    const sem = semestreSelect.value;
    const res = await fetch(`${API}/api/absences/etudiant/me?semestre=${encodeURIComponent(sem)}`, {
      credentials: "include",
    });

    if (res.status === 401) {
      tbodyAbsences.innerHTML = `<tr><td colspan="7" class="muted">Non autorisé. Connectez-vous de nouveau.</td></tr>`;
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Erreur lors du chargement des absences.");
    }

    const absences = await res.json();
    tbodyAbsences.innerHTML = "";

    if (!absences.length) {
      tbodyAbsences.innerHTML = `<tr><td colspan="7" class="muted">Aucune absence pour ce semestre.</td></tr>`;
      return;
    }

    absences.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Date d’absence">${fmtDate(r.dateAbsence)}</td>
        <td data-label="Heure début">${r.heureDebut || "—"}</td>
        <td data-label="Heure fin">${r.heureFin || "—"}</td>
        <td data-label="Durée (h)">${calcDuree(r.heureDebut, r.heureFin)}</td>
        <td data-label="Statut">${badge(r.statut)}</td>
        <td data-label="Date de justification">${fmtDate(r.dateJustification)}</td>
        <td data-label="Matières">${r.matiere?.nom || "—"}</td>
      `;
      tbodyAbsences.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showError(err.message || "Erreur inconnue lors du chargement.");
    tbodyAbsences.innerHTML = "";
  }
}

// -------- Déconnexion --------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API}/api/etudiants/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
    else alert("Erreur lors de la déconnexion.");
  } catch (err) {
    console.error("Erreur déconnexion :", err);
    alert("Erreur réseau lors de la déconnexion.");
  }
});

// -------- Menu mobile --------
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// -------- Modales footer --------
document.querySelectorAll(".footer-link").forEach(link => {
  link.addEventListener("click", () => {
    const modalId = "modal-" + link.dataset.modal;
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "flex";
  });
});
document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal");
    if (modal) modal.style.display = "none";
  });
});
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) e.target.style.display = "none";
});

// -------- Events --------
document.addEventListener("DOMContentLoaded", async () => {
  await loadSemestres();       // Charger semestres selon le niveau
  loadMesAbsences();            // Charger les absences pour le semestre sélectionné
});
semestreSelect.addEventListener("change", loadMesAbsences);
