document.addEventListener("DOMContentLoaded", () => {
  chargerPaiements();

  // Déconnexion
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
      window.location.href = "../connexion/etudiant_connexion.html"; // redirection après logout
    } catch (err) {
      console.error("Erreur logout :", err);
    }
  });
});

// Fonction principale pour charger les paiements
async function chargerPaiements() {
  const totalDuEl = document.getElementById("total-du");
  const totalPayeEl = document.getElementById("total-paye");
  const statutGlobalEl = document.getElementById("statut-global");
  const tableBody = document.querySelector("#tablePaiements tbody");
  const messageEl = document.getElementById("message");

  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/paiements/me", { credentials: "include" });

    if (!res.ok) {
      if (res.status === 404) {
        messageEl.textContent = "Aucune situation de paiement trouvée.";
        totalDuEl.textContent = "—";
        totalPayeEl.textContent = "—";
        statutGlobalEl.textContent = "—";
        return;
      }
      throw new Error("Erreur serveur");
    }

    const paiements = await res.json();

    if (!paiements || paiements.length === 0) {
      messageEl.textContent = "Aucune situation de paiement trouvée.";
      return;
    }

    // Affichage des totaux
    const paiement = paiements[0]; // pour l'année en cours, prend le 1er
    const totalVersements = paiement.versements.reduce((sum, v) => sum + v.montant, 0);
    const totalPayé = paiement.versements
      .filter(v => v.status === "payé")
      .reduce((sum, v) => sum + v.montant, 0);
    const reste = totalVersements - totalPayé;

    totalDuEl.textContent = totalVersements.toLocaleString();
    totalPayeEl.textContent = totalPayé.toLocaleString();

    if (reste === 0) statutGlobalEl.textContent = "Tout payé ✅";
    else if (totalPayé > 0) statutGlobalEl.textContent = "Partiel ⚠️";
    else statutGlobalEl.textContent = "Non payé ❌";

    // Affichage du tableau
    tableBody.innerHTML = ""; // reset
    paiement.versements.forEach(v => {
      const tr = document.createElement("tr");

      const statusClass = v.status === "payé" ? "statut-paye" : "statut-nonpaye";

      tr.innerHTML = `
        <td>Versement ${v.numero}</td>
        <td>${v.montant.toLocaleString()}</td>
        <td class="${statusClass}">${v.status}</td>
        <td>${v.datePaiement ? new Date(v.datePaiement).toLocaleDateString() : "—"}</td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error("Erreur lors du chargement :", err);
    messageEl.textContent = "Impossible de charger les paiements.";
  }

  // ---------- Modales footer ----------
  document.querySelectorAll(".footer-link").forEach(link => {
    link.addEventListener("click", () => {
      document.getElementById("modal-" + link.dataset.modal).style.display = "flex";
    });
  });
  document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => { btn.closest(".modal").style.display = "none"; });
  });
  window.addEventListener("click", (e) => { if(e.target.classList.contains("modal")) e.target.style.display = "none"; });

}
