const tableBody = document.querySelector("#etudiantsTable tbody");
const niveauSelect = document.getElementById("niveauSelect");
const sortNameBtn = document.getElementById("sortNameBtn");
const searchInput = document.getElementById("searchInput");

let etudiants = [];
let sortAsc = true;

async function fetchEtudiants() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants", {
      credentials: "include"
    });
    etudiants = await res.json();

    // Tri initial A→Z (sécuriser si pas d'objet)
    if (Array.isArray(etudiants)) {
      etudiants.sort((a, b) => (a.fullname || "").localeCompare(b.fullname || ""));
      displayEtudiants(etudiants);
    } else {
      tableBody.innerHTML = "<tr><td colspan='3'>Aucun étudiant trouvé</td></tr>";
    }
  } catch (err) {
    console.error("Erreur fetch étudiants:", err);
    tableBody.innerHTML = "<tr><td colspan='3'>Erreur de chargement</td></tr>";
  }
}

function displayEtudiants(list) {
  const studentCount = document.getElementById("studentCount");
  const hommeCount = document.getElementById("hommeCount");
  const femmeCount = document.getElementById("femmeCount");

  if (!list || list.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='3'>Aucun étudiant trouvé</td></tr>";
    studentCount.textContent = "Total : 0";
    hommeCount.textContent = "Hommes : 0";
    femmeCount.textContent = "Femmes : 0";
    return;
  }

  tableBody.innerHTML = "";
  let countHomme = 0;
  let countFemme = 0;

  list.forEach((e) => {
    const tr = document.createElement("tr");

    // Récupérer le champ de genre, tolérer plusieurs noms possibles
    const rawGender = (e.gender || e.sexe || e.sex || "").toString().trim();
    const gNorm = rawGender.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let isFemme = false;
    let isHomme = false;

    if (gNorm.startsWith("f") || gNorm === "femme" || gNorm === "female") isFemme = true;
    else if (gNorm.startsWith("h") || gNorm === "homme" || gNorm === "male") isHomme = true;

    if (isFemme) {
      tr.classList.add("femme");
      countFemme++;
    } else if (isHomme) {
      tr.classList.add("homme");
      countHomme++;
    } else {
      // genre inconnu → pas de class, on peut ajouter une classe 'unknown' si voulu
      tr.classList.add("unknown");
    }

    // Icône selon le genre, ou point d'interrogation si inconnu
    const genderIcon = isFemme
      ? '<i class="fa-solid fa-venus" aria-hidden="true" title="Femme"></i>'
      : isHomme
        ? '<i class="fa-solid fa-mars" aria-hidden="true" title="Homme"></i>'
        : '<i class="fa-solid fa-circle-question" aria-hidden="true" title="Inconnu"></i>';

    tr.innerHTML = `
      <td>${genderIcon} ${e.fullname || "—"}</td>
      <td>${e.phone || "N/A"}</td>
      <td>${e.level || e.niveau || "—"}</td>
    `;

    tableBody.appendChild(tr);
  });

  // Mise à jour des compteurs (sur la liste visible)
  studentCount.textContent = `Total : ${list.length}`;
  hommeCount.textContent = `Hommes : ${countHomme}`;
  femmeCount.textContent = `Femmes : ${countFemme}`;
}

// Filtrer par niveau
niveauSelect.addEventListener("change", () => {
  const niveau = niveauSelect.value;
  const filtered = niveau === "All" ? etudiants : etudiants.filter(e => (e.level || e.niveau) === niveau);
  displayEtudiants(filtered);
});

// Trier par nom
sortNameBtn.addEventListener("click", () => {
  etudiants.sort((a, b) =>
    sortAsc ? (a.fullname || "").localeCompare(b.fullname || "") : (b.fullname || "").localeCompare(a.fullname || "")
  );
  sortAsc = !sortAsc;
  displayEtudiants(etudiants);
});

// Recherche tolérante aux accents
function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

searchInput.addEventListener("input", () => {
  const searchValue = normalizeString(searchInput.value.trim());
  const filtered = etudiants.filter(e =>
    normalizeString(e.fullname || "").includes(searchValue)
  );
  displayEtudiants(filtered);
});

// Déconnexion
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

// Modales et menu mobile (inchangés)
document.querySelectorAll(".footer-link").forEach(link => {
  link.addEventListener("click", () => {
    const modalId = "modal-" + link.dataset.modal;
    document.getElementById(modalId).style.display = "flex";
  });
});
document.querySelectorAll(".close").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.closest(".modal").style.display = "none";
  });
});
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) e.target.style.display = "none";
});
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// Init
fetchEtudiants();
