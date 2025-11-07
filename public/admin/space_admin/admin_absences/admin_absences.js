const API = "https://esmt-2025.onrender.com";





const el = (id) => document.getElementById(id);

const niveauSelect = el("niveauSelect");
const semestreSelect = el("semestreSelect");
const btnChargerEtudiants = el("btnChargerEtudiants");
const listeEtudiants = el("listeEtudiants");
const tbodyAbsences = el("tbodyAbsences");
const btnAjouterLigne = el("btnAjouterLigne");
const tbodyGlobal = el("tbodyGlobal");
const btnChargerVueGlobale = el("btnChargerVueGlobale");
const erreurEl = el("erreur");

let currentEtudiant = null;
let matieresCache = [];

// --------- Logique semestres dynamiques ---------
const SEMESTRES_PAR_NIVEAU = {
  "Licence 1": ["Semestre 1", "Semestre 2"],
  "Licence 2": ["Semestre 3", "Semestre 4"],
  "Licence 3 - RT": ["Semestre 5", "Semestre 6"],
  "Licence 3 - ASR": ["Semestre 5", "Semestre 6"]
};

function updateSemestres() {
  const niveau = niveauSelect.value;
  const semestreOptions = SEMESTRES_PAR_NIVEAU[niveau] || [];
  semestreSelect.innerHTML = "";
  semestreOptions.forEach((sem) => {
    const opt = document.createElement("option");
    opt.value = sem;
    opt.textContent = sem;
    semestreSelect.appendChild(opt);
  });
}

// Initialisation au chargement
updateSemestres();

// Mise à jour automatique des semestres selon le niveau
niveauSelect.addEventListener("change", updateSemestres);

// --------- Utils ---------
function showError(msg){ erreurEl.textContent = msg; erreurEl.style.display = "block"; }
function clearError(){ erreurEl.textContent = ""; erreurEl.style.display = "none"; }
function fmtDateISO(d){ return d ? new Date(d).toISOString().slice(0,10) : ""; }
function badge(statut){
  return statut === "justifié"
    ? `<span class="badge ok">Justifié</span>`
    : `<span class="badge ko">Non justifié</span>`;
}
function calcDuree(debut, fin){
  if(!debut || !fin) return 0;
  const [h1,m1] = debut.split(":").map(Number);
  const [h2,m2] = fin.split(":").map(Number);
  let diff = (h2*60+m2) - (h1*60+m1);
  if(diff < 0) diff = 0;
  return +(diff/60).toFixed(2);
}

// --------- Charger matières du niveau ---------
async function loadMatieres(niveau){
  try {
    const res = await fetch(`${API}/api/matieres/niveau/${encodeURIComponent(niveau)}/semestre/${encodeURIComponent(semestreSelect.value)}`, { credentials:"include" });
    if(!res.ok) throw new Error("Impossible de charger les matières.");
    const data = await res.json();
    matieresCache = data;
    return data;
  } catch(e) {
    showError(e.message);
    return [];
  }
}

// --------- Charger étudiants ---------
async function loadEtudiants(niveau) {
  try {
    const res = await fetch(`${API}/api/etudiants/niveau/${encodeURIComponent(niveau)}`, {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Impossible de charger les étudiants.");
    const data = await res.json();
    data.sort((a, b) =>
      ((a.fullname || a.email).toLowerCase()).localeCompare(
        (b.fullname || b.email).toLowerCase(),
        "fr"
      )
    );
    return data;
  } catch (e) {
    showError(e.message);
    return [];
  }
}


function renderEtudiants(list){
  listeEtudiants.innerHTML = "";
  if(!list.length){ listeEtudiants.innerHTML = `<li>Aucun étudiant dans ce niveau.</li>`; return; }
  list.forEach(u=>{
    const li = document.createElement("li");
    li.innerHTML = `<span class="name">${u.fullname||u.email}</span>
                    <button data-id="${u._id}">Gérer</button>`;
    li.querySelector("button").addEventListener("click", async ()=>{
      currentEtudiant = u;
      document.getElementById("AbsencesTitle").innerHTML = `<h2 style="color:green">${u.fullname}</h2>`;
      await loadMatieres(u.level);
      loadAbsencesEtudiant(u._id);
    });
    listeEtudiants.appendChild(li);
  });
}

// --------- Absences étudiant ---------
async function loadAbsencesEtudiant(etudiantId){
  clearError();
  tbodyAbsences.innerHTML = `<tr><td colspan="8">Chargement…</td></tr>`;
  try{
    const sem = semestreSelect.value;
    const res = await fetch(`${API}/api/absences/admin/etudiant/${etudiantId}?semestre=${encodeURIComponent(sem)}`, { credentials:"include" });
    if(!res.ok) throw new Error("Erreur chargement des absences.");
    const rows = await res.json();
    renderAbsencesRows(rows);
  }catch(e){ showError(e.message); tbodyAbsences.innerHTML=""; }
}

function renderAbsencesRows(rows){
  tbodyAbsences.innerHTML="";
  if(!rows.length){
    tbodyAbsences.innerHTML=`<tr><td colspan="8" class="muted">Aucune absence pour ce semestre.</td></tr>`;
    return;
  }
  rows.forEach(r=>addRow(r));
}

function createMatiereSelect(selectedValue){
  const select = document.createElement("select");
  select.className = "inp-matiere";
  matieresCache.forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m._id;
    opt.textContent = m.nom;
    if(selectedValue && (selectedValue._id===m._id || selectedValue===m._id)) opt.selected=true;
    select.appendChild(opt);
  });
  return select;
}

function addRow(row){
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="date" value="${fmtDateISO(row?.dateAbsence)}" class="inp-date"></td>
    <td><input type="time" value="${row?.heureDebut||''}" class="inp-heureDebut"></td>
    <td><input type="time" value="${row?.heureFin||''}" class="inp-heureFin"></td>
    <td class="td-duree">${row?.duree||0}</td>
    <td>
      <select class="inp-statut">
        <option value="non justifié" ${row?.statut==="non justifié"?"selected":""}>Non justifié</option>
        <option value="justifié" ${row?.statut==="justifié"?"selected":""}>Justifié</option>
      </select>
    </td>
     <td><input type="date" value="${fmtDateISO(row?.dateJustification)}" class="inp-justif"></td>
    <td class="td-matiere"></td>
    <td class="actions">
      ${row?._id
        ? `<button class="btn-save">💾</button><button class="btn-del">🗑️</button>`
        : `<button class="btn-create">🆕</button><button class="btn-cancel">❌</button>`
      }
    </td>
  `;

  tr.querySelector(".td-matiere").appendChild(createMatiereSelect(row?.matiere));

  const heureDebutInput = tr.querySelector(".inp-heureDebut");
  const heureFinInput = tr.querySelector(".inp-heureFin");
  const tdDuree = tr.querySelector(".td-duree");

  const updateDuree = ()=> tdDuree.textContent = calcDuree(heureDebutInput.value, heureFinInput.value);
  heureDebutInput.addEventListener("change", updateDuree);
  heureFinInput.addEventListener("change", updateDuree);
  updateDuree();

  if(row?._id){
    tr.querySelector(".btn-save").addEventListener("click", async ()=>{
      try{
        const payload = collectRow(tr);
        const res = await fetch(`${API}/api/absences/${row._id}`, {
          method:"PATCH",
          credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload)
        });
        if(!res.ok) throw new Error("Échec de la mise à jour.");
        await loadAbsencesEtudiant(currentEtudiant._id);
      }catch(e){ showError(e.message); }
    });
    tr.querySelector(".btn-del").addEventListener("click", async ()=>{
      if(!confirm("Supprimer cette absence ?")) return;
      try{
        const res = await fetch(`${API}/api/absences/${row._id}`, { method:"DELETE", credentials:"include" });
        if(!res.ok) throw new Error("Échec de la suppression.");
        tr.remove();
      }catch(e){ showError(e.message); }
    });
  } else {
    tr.querySelector(".btn-create").addEventListener("click", async ()=>{
      try{
        const payload = collectRow(tr);
        if(!currentEtudiant) return showError("Sélectionnez un étudiant.");
        payload.etudiantId = currentEtudiant._id;
        payload.niveau = currentEtudiant.level;
        payload.semestre = semestreSelect.value;
        const res = await fetch(`${API}/api/absences`, {
          method:"POST",
          credentials:"include",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload)
        });
        if(!res.ok) throw new Error("Échec de la création.");
        await loadAbsencesEtudiant(currentEtudiant._id);
      }catch(e){ showError(e.message); }
    });
    tr.querySelector(".btn-cancel").addEventListener("click", ()=> tr.remove());
  }

  tbodyAbsences.appendChild(tr);
}

function collectRow(tr){
  const dateAbsence = tr.querySelector(".inp-date").value || null;
  const heureDebut = tr.querySelector(".inp-heureDebut").value;
  const heureFin = tr.querySelector(".inp-heureFin").value;
  const statut = tr.querySelector(".inp-statut").value;
  const dateJustification = tr.querySelector(".inp-justif").value || null;
  const matiereId = tr.querySelector(".inp-matiere").value;
  const duree = calcDuree(heureDebut, heureFin);

  if(!dateAbsence) throw new Error("La date d’absence est requise.");
  if(!heureDebut || !heureFin) throw new Error("Heure début et fin requises.");
  if(!matiereId) throw new Error("La matière est requise.");

  return { dateAbsence, heureDebut, heureFin, duree, statut, dateJustification, matiereId };
}

// Ajouter ligne
btnAjouterLigne.addEventListener("click", async ()=>{
  if(!currentEtudiant) return showError("Sélectionnez un étudiant.");
  if(!matieresCache.length) await loadMatieres(currentEtudiant.level);
  addRow(null);
});

// Vue globale
async function loadVueGlobale(){
  clearError();
  tbodyGlobal.innerHTML = `<tr><td colspan="8">Chargement…</td></tr>`;
  try{
    const niveau = niveauSelect.value;
    const semestre = semestreSelect.value;
    const res = await fetch(`${API}/api/absences/niveau/${encodeURIComponent(niveau)}/semestre/${encodeURIComponent(semestre)}`, { credentials:"include" });
    if(!res.ok) throw new Error("Erreur chargement vue globale.");
    const rows = await res.json();
    tbodyGlobal.innerHTML="";
    if(!rows.length){
      tbodyGlobal.innerHTML = `<tr><td colspan="8" class="muted">Aucune absence trouvée.</td></tr>`;
      return;
    }
    rows.forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML=`
        <td>${r.etudiant?.fullname||"—"}</td>
        <td>${r.matiere?.nom||"—"}</td>
        <td>${fmtDateISO(r.dateAbsence)}</td>
        <td>${r.heureDebut||"—"}</td>
        <td>${r.heureFin||"—"}</td>
        <td>${r.duree||0}</td>
        <td>${badge(r.statut)}</td>
        <td>${fmtDateISO(r.dateJustification)||"—"}</td>
      `;
      tbodyGlobal.appendChild(tr);
    });
  }catch(e){ showError(e.message); }
}

// Événements
btnChargerEtudiants.addEventListener("click", async ()=>{
  clearError();
  try{
    const list = await loadEtudiants(niveauSelect.value);
    renderEtudiants(list);
    tbodyAbsences.innerHTML="";
  }catch(e){ showError(e.message); }
});

let vueGlobaleVisible=false;
btnChargerVueGlobale.addEventListener("click", async ()=>{
  if(!vueGlobaleVisible){
    await loadVueGlobale();
    btnChargerVueGlobale.textContent="Masquer toutes les absences";
    vueGlobaleVisible=true;
  } else{
    tbodyGlobal.innerHTML="";
    btnChargerVueGlobale.textContent="Voir toutes les absences";
    vueGlobaleVisible=false;
    clearError();
  }
});

// Menu mobile
document.querySelector(".menu-toggle").addEventListener("click", ()=>{
  document.querySelector(".sidebar").classList.toggle("open");
});

// Toggle œil
document.querySelectorAll(".toggle-card").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const card = btn.closest(".card");
    const content = Array.from(card.children).filter(c=>!c.classList.contains("card-header"));
    content.forEach(c=>c.style.display=(c.style.display==="none"?"block":"none"));
    const icon=btn.querySelector("i");
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  });
});

// Déconnexion
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const isAdminPage = window.location.pathname.includes("admin");
    const url = isAdminPage
      ? `${API}/api/admin/logout`
      : `${API}/api/etudiants/logout`;

    const res = await fetch(url, { method: "POST", credentials: "include" });

    if (res.ok) {
      window.location.href = isAdminPage 
        ? "../../admin_connexion/admin_connexion.html" 
        : "/login.html";
    }
  } catch (err) {
    console.error("Erreur déconnexion :", err);
  }
});
