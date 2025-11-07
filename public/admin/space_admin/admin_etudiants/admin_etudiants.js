document.addEventListener("DOMContentLoaded", () => {
  const niveauSelect = document.getElementById("niveau-select");
  const tableauBody = document.getElementById("etudiants-table-body");


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

  // Charger les étudiants pour le niveau sélectionné
  async function chargerEtudiants() {
    const niveau = niveauSelect.value;
    tableauBody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";
    try {
      const res = await fetch(`https://esmt-2025.onrender.com/api/etudiants/niveau/${encodeURIComponent(niveau)}`);
      const etudiants = await res.json();

      if (!etudiants.length) {
        tableauBody.innerHTML = "<tr><td colspan='7'>Aucun étudiant trouvé</td></tr>";
        return;
      }

      // 🔹 Tri alphabétique par fullname
      etudiants.sort((a, b) => a.fullname.localeCompare(b.fullname, "fr", { sensitivity: "base" }));

      tableauBody.innerHTML = "";
      etudiants.forEach((e, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${e.fullname}</td>
          <td>${e.phone}</td>
          <td>${e.level}</td>
          <td>
            <button class="delete-btn" data-id="${e._id}">Supprimer</button>
          </td>
        `;
        tableauBody.appendChild(tr);
      });

      ajouterEvenementsSuppression();
    } catch (err) {
      console.error(err);
      tableauBody.innerHTML = "<tr><td colspan='7'>Erreur lors du chargement</td></tr>";
    }
  }

  // Ajouter l'événement pour supprimer définitivement
  function ajouterEvenementsSuppression() {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Voulez-vous supprimer définitivement cet étudiant ?")) return;
        try {
          await fetch(`https://esmt-2025.onrender.com/api/etudiants/${id}`, { method: "DELETE" });
          chargerEtudiants();
        } catch (err) { 
          console.error(err); 
        }
      });
    });
  }

  // Événement de changement de niveau
  niveauSelect.addEventListener("change", chargerEtudiants);

  // Menu mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

  // Charger les étudiants au démarrage
  chargerEtudiants();
});
