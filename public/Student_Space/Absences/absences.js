const API = "http://localhost:5000";
const el = (id) => document.getElementById(id);
const semestreSelect = el("semestreSelect");
const tbodyAbsences = el("tbodyAbsences");
const erreurEl = el("erreur");

// -------- Utils --------
function showError(msg){ erreurEl.textContent = msg; erreurEl.style.display = "block"; }
function clearError(){ erreurEl.textContent = ""; erreurEl.style.display = "none"; }
function fmtDate(d){ return d ? new Date(d).toISOString().slice(0,10) : "—"; }
function badge(statut){ return statut === "justifié" ? `<span class="badge ok">Justifié</span>` : `<span class="badge ko">Non justifié</span>`; }

// Calcul durée en heures
function calcDuree(hDebut, hFin){
  if(!hDebut || !hFin) return "—";
  const [h1,m1] = hDebut.split(":").map(Number);
  const [h2,m2] = hFin.split(":").map(Number);
  const duree = (h2 + m2/60) - (h1 + m1/60);
  return duree >= 0 ? duree.toFixed(2) : "—";
}

// -------- Charger absences --------
async function loadMesAbsences(){
  clearError();
  tbodyAbsences.innerHTML = `<tr><td colspan="7">Chargement…</td></tr>`;
  try{
    const sem = semestreSelect.value;
    const res = await fetch(`${API}/api/absences/etudiant/me?semestre=${encodeURIComponent(sem)}`, { credentials: "include" });
    if (!res.ok) throw new Error(await res.json().then(r => r.message));
    const rows = await res.json();
    tbodyAbsences.innerHTML = "";
    if (!rows.length){
      tbodyAbsences.innerHTML = `<tr><td colspan="7" class="muted">Aucune absence pour ce semestre.</td></tr>`;
      return;
    }
    rows.forEach(r => {
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
  }catch(e){ showError(e.message); tbodyAbsences.innerHTML = ""; }
}

// -------- Déconnexion --------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("http://localhost:5000/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "/frontend/Student_Space/connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

// -------- Menu mobile --------
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// -------- Modales --------
document.querySelectorAll(".footer-link").forEach(link => {
  link.addEventListener("click", () => {
    const modalId = "modal-" + link.dataset.modal;
    document.getElementById(modalId).style.display = "flex";
  });
});
document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", () => btn.closest(".modal").style.display = "none");
});
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) e.target.style.display = "none";
});

// -------- Events --------
document.addEventListener("DOMContentLoaded", loadMesAbsences);
semestreSelect.addEventListener("change", loadMesAbsences);
