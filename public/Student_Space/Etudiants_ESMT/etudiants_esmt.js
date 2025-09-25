const tableBody = document.querySelector("#etudiantsTable tbody");
const niveauSelect = document.getElementById("niveauSelect");
const sortNameBtn = document.getElementById("sortNameBtn");

let etudiants = [];
let sortAsc = true;

// Récupérer les étudiants
async function fetchEtudiants() {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants", {
      credentials: "include"
    });
    etudiants = await res.json();

    // Tri initial A->Z
    etudiants.sort((a, b) => a.fullname.localeCompare(b.fullname));
    displayEtudiants(etudiants);
  } catch (err) {
    console.error("Erreur fetch étudiants:", err);
    tableBody.innerHTML = "<tr><td colspan='3'>Erreur de chargement</td></tr>";
  }
}

// Afficher les étudiants
function displayEtudiants(list) {
  if (!list || list.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='3'>Aucun étudiant trouvé</td></tr>";
    return;
  }

  tableBody.innerHTML = "";
  list.forEach((e) => {
    const tr = document.createElement("tr");
    if (e.gender === "Femme") tr.classList.add("femme");
    else if (e.gender === "Homme") tr.classList.add("homme");

    tr.innerHTML = `
      <td>${e.fullname}</td>
      <td>${e.phone || "N/A"}</td>
      <td>${e.level}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Filtrer par niveau
niveauSelect.addEventListener("change", () => {
  const niveau = niveauSelect.value;
  const filtered = niveau === "All" ? etudiants : etudiants.filter(e => e.level === niveau);
  displayEtudiants(filtered);
});

// Trier par nom
sortNameBtn.addEventListener("click", () => {
  etudiants.sort((a, b) =>
    sortAsc ? a.fullname.localeCompare(b.fullname) : b.fullname.localeCompare(a.fullname)
  );
  sortAsc = !sortAsc;
  displayEtudiants(etudiants);
});

// Déconnexion
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

// Gestion modales
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
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

// Menu mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

// Init
fetchEtudiants();
