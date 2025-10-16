document.addEventListener("DOMContentLoaded", async () => {

  // 1️⃣ Vérification de connexion étudiant
  let etudiantId;
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/check", {
      method: "GET",
      credentials: "include"
    });
    const data = await res.json();

    if (!data.connected) {
      window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
      return;
    }

    console.log("Étudiant connecté :", data.user.fullname);
    etudiantId = data.user._id;
  } catch (error) {
    console.error("Erreur de vérification connexion :", error);
    window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
    return;
  }

  // 3️⃣ Charger les 4 dernières notes
  async function chargerDernieresNotes() {
    try {
      const res = await fetch(`https://esmt-2025.onrender.com/api/notes/${etudiantId}/recentes`);
      const notes = await res.json();

      const liste = document.getElementById("dernieres-notes-list");
      liste.innerHTML = "";

      if (!Array.isArray(notes) || notes.length === 0) {
        liste.innerHTML = "<li>Aucune note disponible</li>";
        return;
      }

      notes.slice(0, 4).forEach(note => {
        const li = document.createElement("li");
        li.textContent = `${note.matiere} | Coef: ${note.coefficient} | Note: ${note.note}`;
        liste.appendChild(li);
      });
    } catch (err) {
      console.error("Erreur chargement notes:", err);
    }
  }
  chargerDernieresNotes();

  // 4️⃣ Charger les 4 dernières absences
  async function chargerDernieresAbsences() {
    try {
      const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/absences/me/recentes", {
        credentials: "include"
      });
      const absences = await res.json();

      const liste = document.getElementById("dernieres-absences-list");
      liste.innerHTML = "";

      if (!Array.isArray(absences) || absences.length === 0) {
        liste.innerHTML = "<li>Aucune absence</li>";
        return;
      }

      absences.forEach(abs => {
        const li = document.createElement("li");
        li.textContent = `${abs.niveau} | ${abs.semestre} | Date: ${new Date(abs.dateAbsence).toLocaleDateString()} | Statut: ${abs.statut}`;
        liste.appendChild(li);
      });
    } catch (err) {
      console.error("Erreur chargement absences:", err);
    }
  }
  chargerDernieresAbsences();

  // 5️⃣ Charger les 4 derniers paiements + rappel automatique
  async function chargerDerniersPaiements() {
    try {
      const res = await fetch("https://esmt-2025.onrender.com/api/paiements/me", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur serveur");
      const paiements = await res.json();

      const liste = document.getElementById("dernieres-paiements-list");
      liste.innerHTML = "";

      if (!paiements || paiements.length === 0) {
        liste.innerHTML = "<li>Aucun paiement enregistré</li>";
      } else {
        const versements = paiements[0]?.versements?.slice(-4).reverse() || [];
        if (versements.length === 0) {
          liste.innerHTML = "<li>Aucun paiement effectué</li>";
        } else {
          versements.forEach(v => {
            const li = document.createElement("li");
            li.textContent = `Versement ${v.numero} — ${v.montant.toLocaleString()} FCFA — ${v.status === "payé" ? "✅ Payé" : "❌ En attente"}`;
            liste.appendChild(li);
          });
        }
      }

      // 🔔 Ajout du rappel automatique
      afficherRappelPaiement();

    } catch (err) {
      console.error("Erreur chargement paiements:", err);
    }
  }

  // 🔔 Fonction pour afficher le rappel automatique selon le mois
  function afficherRappelPaiement() {
    const aujourdHui = new Date();
    const mois = aujourdHui.getMonth(); // 0 = janvier
    const jour = aujourdHui.getDate();
    const annee = aujourdHui.getFullYear();

    const rappels = [
      { mois: 11, texte: "Rappel pour le versement 1 des frais académiques" }, // Décembre
      { mois: 1, texte: "Rappel pour le versement 2 des frais académiques" },  // Février
      { mois: 3, texte: "Rappel pour le versement 3 des frais académiques" }   // Avril
    ];

    const rappelActif = rappels.find(r => {
      if (r.mois === mois) {
        const dernierJour = new Date(annee, mois + 1, 0).getDate();
        return jour >= dernierJour - 7 && jour <= dernierJour; // dernière semaine du mois
      }
      return false;
    });

    if (rappelActif) {
      const liste = document.getElementById("dernieres-paiements-list");
      const li = document.createElement("li");
      li.textContent = rappelActif.texte + " 📅";
      li.style.color = "#d9534f";
      li.style.fontWeight = "bold";
      li.style.marginTop = "10px";
      liste.appendChild(li);
    }
  }

  chargerDerniersPaiements();

});

// 🧭 Gestion modales et menu
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

window.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

document.querySelector(".mobile-menu-btn").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) {
    console.error("Erreur déconnexion :", err);
  }
});
