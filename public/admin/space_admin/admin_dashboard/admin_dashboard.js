/* admin_dashboard_advanced.js
   KPIs + Charts + Matières + Recent Actions
   Avec filtre par niveau, semestre et période (from/to)
*/

const API = "https://esmt-2025.onrender.com/api";

// DOM
const niveauFilter = document.getElementById("niveauFilter");
const semestreFilter = document.getElementById("semestreFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const applyFilters = document.getElementById("applyFilters");
const refreshBtn = document.getElementById("refreshBtn");

const kpiStudents = document.getElementById("kpiStudents");
const kpiAvg = document.getElementById("kpiAvg");
const kpiAbsences = document.getElementById("kpiAbsences");
const kpiPassRate = document.getElementById("kpiPassRate");

const chartEvolutionCtx = document.getElementById("chartEvolution").getContext("2d");
const matiereChartCtx = document.getElementById("matiereChart").getContext("2d");
const chartAbsencesCtx = document.getElementById("chartAbsences").getContext("2d");

const subjectsTableBody = document.querySelector("#subjectsTable tbody");
const searchSubject = document.getElementById("searchSubject");
const exportCsvBtn = document.getElementById("exportCsv");
const recentList = document.getElementById("recentList");

const menuToggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
menuToggle?.addEventListener("click", ()=> sidebar.classList.toggle("open"));

// Chart instances
let chartEvolution = null;
let matiereChart = null;
let chartAbsences = null;

// Small util: safe fetch + parse JSON, returns null on error
async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, { credentials: "include", ...opts });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { __raw: text, ok: res.ok, status: res.status }; }
  } catch (err) {
    console.error("Network error fetch:", url, err);
    return null;
  }
}

// Helper: format number
function fmt(n, digits=2){ if (n==null||isNaN(n)) return "—"; return Number(n).toFixed(digits); }

// --- Main loader ---
async function loadAll() {
  const niveau = niveauFilter.value;
  const semestre = semestreFilter.value;
  const from = dateFrom.value || null;
  const to = dateTo.value || null;

  await Promise.all([
    loadKpiStudents(niveau),
    loadNotesAndCharts(niveau, semestre, from, to),
    loadAbsences(niveau, semestre, from, to),
    loadSubjectsTable(niveau, semestre, from, to),
    loadRecentActions(niveau)
  ]);
}

// --- KPI étudiants ---
async function loadKpiStudents(niveau){
  kpiStudents.textContent = "…";
  const data = await fetchJson(`${API}/etudiants?niveau=${encodeURIComponent(niveau)}`);
  if (!data) { kpiStudents.textContent = "—"; return; }
  if (Array.isArray(data)) kpiStudents.textContent = data.length;
  else kpiStudents.textContent = "—";
}

// --- Absences ---
async function loadAbsences(niveau, semestre, from, to){
  kpiAbsences.textContent = "…";
  try {
    const url = `${API}/absences/niveau/${encodeURIComponent(niveau)}/semestre/${encodeURIComponent(semestre)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) { kpiAbsences.textContent = "—"; return; }
    const arr = await res.json();

    // Filtrer par période
    const filtered = arr.filter(a => {
      const absDate = a.date ? new Date(a.date) : null;
      if (from && absDate && absDate < new Date(from)) return false;
      if (to) { const dTo = new Date(to); dTo.setHours(23,59,59,999); if (absDate && absDate > dTo) return false; }
      return true;
    });

    const total = filtered.length;
    kpiAbsences.textContent = total;

    const byStatus = filtered.reduce((acc, a) => {
      const s = a.statut || "non justifié";
      acc[s] = (acc[s]||0)+1;
      return acc;
    }, {});

    const labels = Object.keys(byStatus);
    const values = labels.map(l=>byStatus[l]);

    if (chartAbsences) chartAbsences.destroy();
    chartAbsences = new Chart(chartAbsencesCtx, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: ["#f97316","#60a5fa","#34d399"] }] },
      options: { plugins:{legend:{position:"bottom"}} }
    });

  } catch (err) {
    console.error("loadAbsences error", err);
    kpiAbsences.textContent = "—";
  }
}

// --- Notes + Charts ---
async function loadNotesAndCharts(niveau, semestre, from, to){
  kpiAvg.textContent = "…";
  kpiPassRate.textContent = "…";
  try {
    const url = `${API}/notes?niveau=${encodeURIComponent(niveau)}`;
    const notes = await fetchJson(url);
    if (!Array.isArray(notes)) { kpiAvg.textContent = "—"; kpiPassRate.textContent = "—"; return; }

    const semMap = {};
    const matMap = {};
    let totalValidCount = 0;
    let totalCount = 0;

    for (const n of notes) {
      const created = n.createdAt ? new Date(n.createdAt) : null;
      if (from && created && created < new Date(from)) continue;
      if (to) { const dTo = new Date(to); dTo.setHours(23,59,59,999); if (created && created > dTo) continue; }
      if (semestre && n.semestre && !n.semestre.toLowerCase().includes(semestre.toLowerCase())) continue;

      const note1 = (n.note1 != null) ? Number(n.note1) : null;
      const note2 = (n.note2 != null) ? Number(n.note2) : null;
      const coef = Number(n.coefficient || 1);
      let moyenne = null;
      if (note1 != null && note2 != null) moyenne = note1*3/5 + note2*2/5;
      else if (note1 != null) moyenne = note1*3/5;
      else if (note2 != null) moyenne = note2*2/5;
      if (moyenne == null) continue;

      const sKey = n.semestre || "Semestre inconnu";
      if (!semMap[sKey]) semMap[sKey] = { totalWeighted: 0, totalCoef: 0 };
      semMap[sKey].totalWeighted += moyenne * coef;
      semMap[sKey].totalCoef += coef;

      const mat = n.matiere || "Inconnu";
      if (!matMap[mat]) matMap[mat] = { totalWeighted: 0, totalCoef: 0, count: 0 };
      matMap[mat].totalWeighted += moyenne * coef;
      matMap[mat].totalCoef += coef;
      matMap[mat].count += 1;

      totalCount++;
      if (moyenne >= 10) totalValidCount++;
    }

    let avgSemestre = null;
    if (semestre && semMap[semestre]) avgSemestre = semMap[semestre].totalCoef ? semMap[semestre].totalWeighted / semMap[semestre].totalCoef : null;
    else {
      let totW=0, totC=0;
      for (const k in semMap){ totW += semMap[k].totalWeighted; totC += semMap[k].totalCoef; }
      avgSemestre = totC ? totW/totC : null;
    }
    kpiAvg.textContent = avgSemestre != null ? fmt(avgSemestre,2) : "—";

    const passRate = totalCount ? (totalValidCount/totalCount*100) : null;
    kpiPassRate.textContent = passRate != null ? `${fmt(passRate,1)} %` : "—";

    const semLabels = Object.keys(semMap).sort();
    const semValues = semLabels.map(k => semMap[k].totalCoef ? semMap[k].totalWeighted/semMap[k].totalCoef : 0);

    if (chartEvolution) chartEvolution.destroy();
    chartEvolution = new Chart(chartEvolutionCtx, {
      type: 'line',
      data: { labels: semLabels, datasets: [{ label: 'Moyenne', data: semValues, borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.12)', fill:true }]},
      options: { scales:{ y:{ beginAtZero:true, max:20 } } }
    });

    const matArr = Object.entries(matMap).map(([nom,o])=>({ nom, moyenne: o.totalCoef ? o.totalWeighted/o.totalCoef : 0, count: o.count }))
                    .sort((a,b)=>b.moyenne - a.moyenne);

    if (matiereChart) matiereChart.destroy();
    matiereChart = new Chart(matiereChartCtx, {
      type: 'bar',
      data: {
        labels: matArr.map(m => m.nom),
        datasets: [{ label:'Moyenne par matière', data: matArr.map(m => fmt(m.moyenne,2)),
                     backgroundColor: matArr.map(m => m.moyenne>=14?'#10b981':m.moyenne>=10?'#facc15':'#ef4444') }]
      },
      options:{ scales:{y:{beginAtZero:true,max:20}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label: ctx=>`Moyenne: ${ctx.raw}`}}} }
    });

  } catch (err) { console.error("loadNotesAndCharts", err); kpiAvg.textContent="—"; kpiPassRate.textContent="—"; }
}

// --- Subjects table ---
async function loadSubjectsTable(niveau, semestre, from, to){
  subjectsTableBody.innerHTML = `<tr><td colspan="5">Chargement…</td></tr>`;
  try {
    const notes = await fetchJson(`${API}/notes?niveau=${encodeURIComponent(niveau)}`);
    if (!Array.isArray(notes)) { subjectsTableBody.innerHTML = `<tr><td colspan="5">Erreur récupération</td></tr>`; return; }

    const map = {};
    for (const n of notes) {
      const created = n.createdAt ? new Date(n.createdAt) : null;
      if (from && created && created < new Date(from)) continue;
      if (to) { const dTo = new Date(to); dTo.setHours(23,59,59,999); if (created && created > dTo) continue; }
      if (semestre && n.semestre && !n.semestre.toLowerCase().includes(semestre.toLowerCase())) continue;

      const nom = n.matiere || "Inconnu";
      const coef = Number(n.coefficient || 1);
      const note1 = n.note1 != null ? Number(n.note1) : null;
      const note2 = n.note2 != null ? Number(n.note2) : null;
      let moy = null;
      if (note1 != null && note2 != null) moy = note1*3/5 + note2*2/5;
      else if (note1 != null) moy = note1*3/5;
      else if (note2 != null) moy = note2*2/5;
      if (moy==null) continue;

      if (!map[nom]) map[nom] = { coefSum:0, weightedSum:0, valid:0, nonValid:0, count:0 };
      map[nom].coefSum += coef;
      map[nom].weightedSum += moy*coef;
      map[nom].count += 1;
      if (moy >= 10) map[nom].valid +=1; else map[nom].nonValid +=1;
    }

    const rows = Object.entries(map).map(([matiere,o])=>({
      matiere,
      coefAvg: o.coefSum/o.count || 0,
      moyenne: o.coefSum ? o.weightedSum/o.coefSum : 0,
      valid: o.valid,
      nonValid: o.nonValid
    })).sort((a,b)=>b.moyenne-a.moyenne);

    renderSubjectsRows(rows);
    searchSubject.oninput = ()=> renderSubjectsRows(rows, searchSubject.value.trim().toLowerCase());
    exportCsvBtn.onclick = ()=> exportSubjectsCsv(rows);

  } catch (err) { console.error("loadSubjectsTable", err); subjectsTableBody.innerHTML=`<tr><td colspan="5">Erreur</td></tr>`; }
}

function renderSubjectsRows(rows, q=""){
  const filtered = rows.filter(r=>r.matiere.toLowerCase().includes(q));
  if (!filtered.length) { subjectsTableBody.innerHTML=`<tr><td colspan="5">Aucune matière correspondant à la recherche.</td></tr>`; return; }
  subjectsTableBody.innerHTML = filtered.map(r=>`
    <tr>
      <td>${escapeHtml(r.matiere)}</td>
      <td>${fmt(r.coefAvg,2)}</td>
      <td>${fmt(r.moyenne,2)}</td>
      <td>${r.valid}</td>
      <td>${r.nonValid}</td>
    </tr>`).join("");
}

function exportSubjectsCsv(rows){
  if (!rows?.length) return alert("Rien à exporter.");
  const lines = [["Matière","Coef moyen","Moyenne","Validés","Non validés"]];
  rows.forEach(r=>lines.push([r.matiere, fmt(r.coefAvg,2), fmt(r.moyenne,2), r.valid, r.nonValid]));
  const csv = lines.map(l=>l.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`matieres_${niveauFilter.value}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// --- Recent Actions ---
let allRecentActions=[], showingAll=false;
const recentLimit=10, RESET_KEY="recentActionsReset";
const voirPlusBtn = document.createElement("button");
voirPlusBtn.textContent="Voir plus"; voirPlusBtn.style.cssText="margin-top:10px;cursor:pointer;padding:8px 12px;border:none;border-radius:6px;background:#002d73;color:#fff;";
voirPlusBtn.addEventListener("click", ()=> { showingAll = !showingAll; renderRecentActions(); });
const resetBtn = document.createElement("button");
resetBtn.textContent="Réinitialiser"; resetBtn.style.cssText="margin-left:10px;cursor:pointer;padding:8px 12px;border:none;border-radius:6px;background:#6b7280;color:#fff;";
resetBtn.addEventListener("click", ()=>{
  if(!confirm("Voulez-vous vraiment réinitialiser et supprimer toutes les actions récentes ?")) return;
  localStorage.setItem(RESET_KEY, Date.now().toString());
  allRecentActions=[]; showingAll=false; recentList.innerHTML="<li>Aucune action récente.</li>";
  voirPlusBtn.remove(); resetBtn.remove();
});

async function loadRecentActions(niveau="Licence 1"){
  try {
    allRecentActions=[]; showingAll=false; recentList.innerHTML="";
    const resetTs = parseInt(localStorage.getItem(RESET_KEY)||"0",10);

    const resNotes = await fetch(`${API}/notes?niveau=${encodeURIComponent(niveau)}`, {credentials:"include"});
    const notes = await resNotes.json();
    const noteItems = (notes||[]).map(n=>{
      const nomEtudiant = n.etudiantId?.fullname||"Étudiant inconnu";
      const date = n.createdAt ? new Date(n.createdAt).getTime() : Date.now();
      return { type:"note", date, txt:`${nomEtudiant} : ${n.matiere} [${n.note1??'-'}|${n.note2??'-'}] - ${new Date(date).toLocaleString()}`};
    });

    const resEmplois = await fetch(`${API}/emplois?niveau=${encodeURIComponent(niveau)}`, {credentials:"include"});
    const emplois = await resEmplois.json();
    const emploiItems = (emplois||[]).map(e=>{
      const date = e.uploadedAt ? new Date(e.uploadedAt).getTime() : Date.now();
      return {type:"emploi", date, txt:`Nouvel emploi du temps ajouté - Niveau : ${e.niveau} - ${new Date(date).toLocaleString()}`};
    });

    allRecentActions = [...noteItems,...emploiItems].filter(i=>i.date>resetTs).sort((a,b)=>b.date-a.date);
    renderRecentActions();
    const container = recentList.parentNode;
    if (!container.contains(voirPlusBtn)) container.appendChild(voirPlusBtn);
    if (!container.contains(resetBtn)) container.appendChild(resetBtn);

  } catch(err){ console.error("Erreur chargement actions récentes :",err); recentList.innerHTML="<li>Erreur lors du chargement.</li>"; }
}

function renderRecentActions(){
  recentList.innerHTML="";
  const itemsToShow = showingAll ? allRecentActions : allRecentActions.slice(0,recentLimit);
  voirPlusBtn.textContent = showingAll ? "Masquer" : "Voir plus";
  if (!itemsToShow.length) { recentList.innerHTML="<li>Aucune action récente.</li>"; return; }
  itemsToShow.forEach(item=>{ const li=document.createElement("li"); li.textContent=item.txt; recentList.appendChild(li); });
}

  // -------- MODALE CHANGEMENT MOT DE PASSE --------
const modal = document.getElementById("passwordModal");
const link = document.getElementById("changePasswordLink");
const closeBtn = document.querySelector(".modal .close");

link.addEventListener("click", () => {
  modal.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
});

// -------- FORMULAIRE --------
document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const messageEl = document.getElementById("passwordMessage");

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "❌ Les nouveaux mots de passe ne correspondent pas.";
    messageEl.style.color = "red";
    return;
  }

  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/admin/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      messageEl.textContent = "✅ " + data.message;
      messageEl.style.color = "green";
      document.getElementById("passwordForm").reset();
    } else {
      messageEl.textContent = "❌ " + data.message;
      messageEl.style.color = "red";
    }
  } catch (err) {
    console.error("Erreur:", err);
    messageEl.textContent = "❌ Erreur serveur.";
    messageEl.style.color = "red";
  }
});

// --- Utils ---
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// --- Events ---
applyFilters.addEventListener("click", loadAll);
refreshBtn.addEventListener("click", loadAll);
searchSubject.addEventListener("keypress", (e)=>{ if(e.key==="Enter") e.preventDefault(); });
document.getElementById("logoutBtn")?.addEventListener("click", async ()=>{
  try{ await fetch(`${API}/admin/logout`, { method:"POST", credentials:"include" }); window.location.href="/frontend/admin/admin_connexion/admin_connexion.html"; }
  catch(err){ console.error(err); }
});

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
            ? "/backend/public/admin/space_admin/admin_connexion/admin_connexion.html" 
            : "/login.html";
        }
      } catch (err) {
        console.error("Erreur déconnexion :", err);
      }
    });

// Auto-load
window.addEventListener("DOMContentLoaded", loadAll);
window.addEventListener("DOMContentLoaded", ()=>loadRecentActions());
