// admin_releve.js
// Assure-toi que les IDs dans ton HTML correspondent à ceux utilisés ici.

const API_BASE = "https://esmt-2025.onrender.com/api/releve";
const API_ADMIN = "https://esmt-2025.onrender.com/api/admin";

const niveauSelect = document.getElementById("niveauSelect");
const semestreSelect = document.getElementById("semestreSelect");
const chargerModelBtn = document.getElementById("chargerModel");
const nouveauModelBtn = document.getElementById("nouveauModel");
const editeur = document.getElementById("editeur");
const domainesList = document.getElementById("domainesList");
const ajouterDomaineBtn = document.getElementById("ajouterDomaineBtn");
const enregistrerModelBtn = document.getElementById("enregistrerModelBtn");
const titreInput = document.getElementById("titreInput");
const listeModeles = document.getElementById("listeModeles");
const supprimerModelBtn = document.getElementById("supprimerModelBtn");
const annulerEditionBtn = document.getElementById("annulerEditionBtn");

let currentModel = null; // objet en édition (avec _id) ou null pour nouveau
let matieresListe = [];
// ---------- Utilitaires ----------
function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // texte non JSON — retourne texte brut
    return { __raw: text };
  }
}

async function checkAdmin() {
  try {
    const res = await fetch(`${API_ADMIN}/check`, { credentials: "include" });
    if (!res.ok) {
      console.warn("Erreur check admin:", res.status);
      return false;
    }
    const data = await res.json();
    return !!data.connected;
  } catch (err) {
    console.error("Erreur réseau checkAdmin:", err);
    return false;
  }
}

function showEditor(show = true) {
  editeur.style.display = show ? "block" : "none";
}

// ---------- Création des éléments DOM pour domaines/matières ----------
function createDomaineElement(domaine = { titre: "", matieres: [] }) {
  const wrapper = document.createElement("div");
  wrapper.className = "domaine";

  const header = document.createElement("div");
  header.className = "domaine-header";

  const titreInputEl = document.createElement("input");
  titreInputEl.className = "domaine-titre";
  titreInputEl.placeholder = "Titre du domaine";
  titreInputEl.value = domaine.titre || "";

  const supprDomaineBtn = document.createElement("button");
  supprDomaineBtn.type = "button";
  supprDomaineBtn.className = "suppr-domaine";
  supprDomaineBtn.textContent = "Supprimer domaine";

  header.appendChild(titreInputEl);
  header.appendChild(supprDomaineBtn);

  const matieresContainer = document.createElement("div");
  matieresContainer.className = "matieres-container";

  const addMatBtn = document.createElement("button");
  addMatBtn.type = "button";
  addMatBtn.className = "add-mat-btn";
  addMatBtn.textContent = "+ Ajouter matière";

  function addMatiereRow(m = { ordre: matieresContainer.children.length + 1, nom: "", coefficient: 1 }) {
  const row = document.createElement("div");
  row.className = "matiere-row";

  const ordreInput = document.createElement("input");
  ordreInput.className = "matiere-ordre";
  ordreInput.type = "number";
  ordreInput.min = "1";
  ordreInput.style.width = "60px";
  ordreInput.value = m.ordre || matieresContainer.children.length + 1;

  const nomInput = document.createElement("input");
  nomInput.className = "matiere-nom";
  nomInput.placeholder = "Nom de la matière";
  nomInput.value = m.nom || "";
  nomInput.setAttribute("list", "matieresList");

  const coefInput = document.createElement("input");
  coefInput.className = "matiere-coef";
  coefInput.type = "number";
  coefInput.step = "0.1";
  coefInput.style.width = "80px";
  coefInput.value = (m.coefficient !== undefined && m.coefficient !== null) ? m.coefficient : 1;

  nomInput.addEventListener("input", () => {
    const val = nomInput.value.trim();
    const matiere = matieresListe.find(x => x.nom === val);
    if (matiere) {
      coefInput.value = matiere.coefficient;
      nomInput.setCustomValidity("");
    } else {
      coefInput.value = 1;
      nomInput.setCustomValidity("Veuillez choisir une matière dans la liste.");
    }
  });

  const supprMatBtn = document.createElement("button");
  supprMatBtn.type = "button";
  supprMatBtn.className = "suppr-mat";
  supprMatBtn.textContent = "Supprimer";

  row.appendChild(ordreInput);
  row.appendChild(nomInput);
  row.appendChild(coefInput);
  row.appendChild(supprMatBtn);

  supprMatBtn.addEventListener("click", () => {
    row.remove();
    // réindexer ordres
    [...matieresContainer.querySelectorAll(".matiere-row")].forEach((r, i) => {
      const o = r.querySelector(".matiere-ordre");
      if (o) o.value = i + 1;
    });
  });

  matieresContainer.appendChild(row);
}


  // remplir avec les matières fournies
  (domaine.matieres || []).forEach(m => addMatiereRow(m));

  addMatBtn.addEventListener("click", () => addMatiereRow({ ordre: matieresContainer.children.length + 1, nom: "", coefficient: 1 }));

  supprDomaineBtn.addEventListener("click", () => {
    if (confirm("Supprimer ce domaine ?")) wrapper.remove();
  });

  wrapper.appendChild(header);
  wrapper.appendChild(matieresContainer);
  wrapper.appendChild(addMatBtn);

  return wrapper;
}

// ---------- Rendu éditeur depuis modèle ----------
function renderEditorFromModel(model) {
  showEditor(true);
  titreInput.value = model.titre || "";
  domainesList.innerHTML = "";
  (model.domaines || []).forEach(d => {
    domainesList.appendChild(createDomaineElement(d));
  });
  currentModel = model && model._id ? model : null;
  supprimerModelBtn.style.display = currentModel ? "inline-block" : "none";
}

// ---------- Collecter modèle depuis l'éditeur ----------
function collectModelFromEditor() {
  const domaines = [];
  for (const domEl of domainesList.querySelectorAll(".domaine")) {
    const titre = (domEl.querySelector(".domaine-titre")?.value || "").trim();
    const matieres = [];
    for (const r of domEl.querySelectorAll(".matiere-row")) {
      const ordre = Number(r.querySelector(".matiere-ordre")?.value) || (matieres.length + 1);
      const nom = (r.querySelector(".matiere-nom")?.value || "").trim();
      const coefficient = parseFloat(r.querySelector(".matiere-coef")?.value) || 1;
      if (nom) matieres.push({ ordre, nom, coefficient });
    }
    if (titre) domaines.push({ titre, matieres });
  }

  return {
    niveau: niveauSelect.value,
    semestre: semestreSelect.value,
    titre: (titreInput.value || "").trim(),
    domaines
  };
}

// ---------- Charger modèles (liste) ----------
async function loadModelesList(niveau, semestre) {
  try {
    const url = `${API_BASE}?niveau=${encodeURIComponent(niveau)}&semestre=${encodeURIComponent(semestre)}`;
    const res = await fetch(url, { credentials: "include" });
    if (res.status === 401) {
      alert("Accès refusé : connectez-vous en tant qu'administrateur.");
      return null;
    }
    if (!res.ok) {
      const body = await safeJson(res);
      console.error("Erreur loadModelesList:", res.status, body);
      alert("Erreur lors du chargement des modèles.");
      return null;
    }
    const models = await res.json();
    return models;
  } catch (err) {
    console.error("Erreur réseau loadModelesList:", err);
    alert("Erreur réseau lors du chargement des modèles.");
    return null;
  }
}

// ---------- Render liste de modèles ----------
function renderModelesList(models) {
  listeModeles.innerHTML = "";
  if (!models || models.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucun modèle trouvé pour ce niveau/semestre.";
    listeModeles.appendChild(li);
    return;
  }
  models.forEach(m => {
    const li = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = m.titre || `${m.niveau} - ${m.semestre}`;
    li.appendChild(label);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Éditer";
    editBtn.style.marginLeft = "8px";

    const dupBtn = document.createElement("button");
    dupBtn.type = "button";
    dupBtn.textContent = "Dupliquer";
    dupBtn.style.marginLeft = "6px";

    li.appendChild(editBtn);
    li.appendChild(dupBtn);
    listeModeles.appendChild(li);

    editBtn.addEventListener("click", async () => {
      await loadAndOpenModel(m._id);
    });

    dupBtn.addEventListener("click", async () => {
      // charger puis ouvrir en tant que nouveau (sans _id)
      const model = await fetchModelById(m._id);
      if (!model) return;
      delete model._id;
      model.titre = (model.titre || "") + " (copie)";
      renderEditorFromModel(model);
      currentModel = null; // nouvelle création
    });
  });
}

// ---------- fetch model by id ----------
async function fetchModelById(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { credentials: "include" });
    if (res.status === 401) {
      alert("Accès refusé (401).");
      return null;
    }
    if (!res.ok) {
      const body = await safeJson(res);
      console.error("Erreur fetchModelById:", res.status, body);
      alert("Erreur lors du chargement du modèle.");
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Erreur réseau fetchModelById:", err);
    alert("Erreur réseau lors du chargement du modèle.");
    return null;
  }
}

async function loadAndOpenModel(id) {
  const model = await fetchModelById(id);
  if (!model) return;
  renderEditorFromModel(model);
}

// ---------- Création / Mise à jour / Suppression ----------
async function createModel(payload) {
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) throw new Error("Non autorisé (vérifie ta session admin).");
    if (!res.ok) {
      const body = await safeJson(res);
      console.error("Erreur createModel:", res.status, body);
      throw new Error(body?.message || "Erreur création");
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function updateModel(id, payload) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) throw new Error("Non autorisé (vérifie ta session admin).");
    if (!res.ok) {
      const body = await safeJson(res);
      console.error("Erreur updateModel:", res.status, body);
      throw new Error(body?.message || "Erreur mise à jour");
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function deleteModel(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (res.status === 401) throw new Error("Non autorisé (vérifie ta session admin).");
    if (!res.ok) {
      const body = await safeJson(res);
      console.error("Erreur deleteModel:", res.status, body);
      throw new Error(body?.message || "Erreur suppression");
    }
    return true;
  } catch (err) {
    throw err;
  }
}

// ---------- Événements UI ----------
chargerModelBtn.addEventListener("click", async () => {
  const niveau = niveauSelect.value;
  const semestre = semestreSelect.value;
  const models = await loadModelesList(niveau, semestre);
  renderModelesList(models);
});

nouveauModelBtn.addEventListener("click", () => {
  const template = { niveau: niveauSelect.value, semestre: semestreSelect.value, titre: "", domaines: [] };
  renderEditorFromModel(template);
  currentModel = null;
});

ajouterDomaineBtn.addEventListener("click", () => {
  domainesList.appendChild(createDomaineElement({ titre: "", matieres: [] }));
});

enregistrerModelBtn.addEventListener("click", async () => {
  try {
    // Vérifier session admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      alert("Vous devez être connecté en tant qu'administrateur pour enregistrer un modèle.");
      return;
    }

    const payload = collectModelFromEditor();
    // validation minimale
    if (!payload.niveau || !payload.semestre) {
      alert("Niveau et semestre requis.");
      return;
    }

    if (currentModel && currentModel._id) {
      // mise à jour
      await updateModel(currentModel._id, payload);
      alert("Modèle mis à jour.");
      // recharger la liste
      chargerModelBtn.click();
    } else {
      // création
      await createModel(payload);
      alert("Modèle créé.");
      // recharger la liste
      chargerModelBtn.click();
    }
    showEditor(false);
  } catch (err) {
    console.error(err);
    alert(err.message || "Erreur lors de l'enregistrement du modèle.");
  }
});

supprimerModelBtn.addEventListener("click", async () => {
  if (!currentModel || !currentModel._id) return alert("Aucun modèle sélectionné.");
  if (!confirm("Confirmer la suppression du modèle ?")) return;
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      alert("Vous devez être connecté en tant qu'administrateur.");
      return;
    }
    await deleteModel(currentModel._id);
    alert("Modèle supprimé.");
    showEditor(false);
    chargerModelBtn.click();
  } catch (err) {
    console.error(err);
    alert(err.message || "Erreur lors de la suppression.");
  }
});

annulerEditionBtn.addEventListener("click", () => {
  showEditor(false);
});



async function loadMatieresList(niveau, semestre) {
  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/matieres/niveau/${encodeURIComponent(niveau)}/semestre/${encodeURIComponent(semestre)}`, {credentials:"include"});

    if (!res.ok) throw new Error("Erreur récupération matières");
    matieresListe = await res.json();

    function refreshDatalist() {
      const datalist = document.getElementById("matieresList");
      datalist.innerHTML = "";
      matieresListe.forEach(m => {
        const option = document.createElement("option");
        option.value = m.nom;
        option.dataset.coef = m.coefficient;
        datalist.appendChild(option);
      });
    }


    refreshDatalist();
  } catch(err) {
    console.error(err);
    matieresListe = [];
    refreshDatalist();
  }
}

function refreshDatalist() {
  const datalist = document.getElementById("matieresList");
  datalist.innerHTML = ""; 
  matieresListe.forEach(m => {
    const option = document.createElement("option");
    option.value = m.nom;
    option.dataset.coef = m.coefficient;
    datalist.appendChild(option);
  });
}


// Charger les matières à chaque changement niveau/semestre
niveauSelect.addEventListener("change", () => loadMatieresList(niveauSelect.value, semestreSelect.value));
semestreSelect.addEventListener("change", () => loadMatieresList(niveauSelect.value, semestreSelect.value));

// Charger au démarrage aussi
window.addEventListener("DOMContentLoaded", async () => {
  await loadMatieresList(niveauSelect.value, semestreSelect.value);
  // ton code checkAdmin...
});

// Validation avant sauvegarde
enregistrerModelBtn.addEventListener("click", async () => {
  // ...
  const payload = collectModelFromEditor();
  if (!payload) return; // validation a échoué

  // vérification matières
  for (const dom of payload.domaines) {
    for (const mat of dom.matieres) {
      if (!matieresListe.find(m => m.nom === mat.nom)) {
        alert(`La matière "${mat.nom}" n'est pas dans la liste des matières enregistrées.`);
        return;
      }
    }
  }
  // suite de ta sauvegarde...
});

// ---------- Auto-load au démarrage ----------
window.addEventListener("DOMContentLoaded", async () => {
  // vérifie si admin connecté — si pas connecté, laisse l'UI mais bloque les actions sensibles
  const connected = await checkAdmin();
  if (!connected) {
    console.warn("Admin non connecté : les opérations de création/modification/suppression nécessitent une connexion.");
    // option : tu peux masquer les boutons sensibles si déconnecté
    // enregistrerModelBtn.disabled = true;
    // supprimerModelBtn.disabled = true;
  }
  // Charger la liste par défaut
  chargerModelBtn.click();
});

// Menu mobile
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});