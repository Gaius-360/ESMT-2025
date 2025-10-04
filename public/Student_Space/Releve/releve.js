const API_BASE = "https://esmt-2025.onrender.com";

// Déconnexion
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/api/etudiants/logout`, { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

document.addEventListener("DOMContentLoaded", async () => {
  const nomEl = document.getElementById("nomEtudiant");
  const niveauEl = document.getElementById("niveauEtudiant");
  const titreModeleEl = document.getElementById("titreModele");
  const moyenneSemestreEl = document.getElementById("moyenneSemestre");
  const tableauxEl = document.getElementById("tableaux");
  const erreurEl = document.getElementById("erreur");
  const semestreSelect = document.getElementById("semestreSelect");
  const btnTelecharger = document.getElementById("btnTelecharger");
  const { jsPDF } = window.jspdf;

  let etudiant = null;

  // ---------- Utils ----------
  function getSemestresPourNiveau(niveau) {
    switch(niveau) {
      case "Licence 1": return ["Semestre 1", "Semestre 2"];
      case "Licence 2": return ["Semestre 3", "Semestre 4"];
      case "Licence 3 - RT":
      case "Licence 3 - ASR": return ["Semestre 5", "Semestre 6"];
      default: return ["Semestre 1", "Semestre 2"];
    }
  }

  function remplirSelectSemestres(niveau) {
    const semestres = getSemestresPourNiveau(niveau);
    semestreSelect.innerHTML = "";
    semestres.forEach((s, i) => {
      const option = document.createElement("option");
      option.value = i; // index pour simplifier
      option.textContent = s;
      semestreSelect.appendChild(option);
    });
  }

  function escapeHtml(s){ 
    if(s===null||s===undefined) return ""; 
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  function fmt(v,fallback="—"){return (v===null||v===undefined||v==="")?fallback:v;}
  function showError(msg){erreurEl.textContent=msg; erreurEl.style.display="block";}
  function clearError(){erreurEl.textContent=""; erreurEl.style.display="none";}

  // ---------- Vérifier étudiant connecté ----------
  try {
    const resCheck = await fetch(`${API_BASE}/api/etudiants/check`, { credentials: "include" });
    const dataCheck = await resCheck.json();
    if(!dataCheck.connected){ showError("Vous devez être connecté."); return; }
    etudiant = dataCheck.user;
    nomEl.textContent = etudiant.fullname || "—";
    niveauEl.textContent = etudiant.level || "—";

    // remplir le select selon niveau
    remplirSelectSemestres(etudiant.level);

    // Charger relevé initial
    await loadReleve(semestreSelect.selectedIndex);

  } catch(err) {
    showError("Erreur lors de la vérification de session.");
    console.error(err);
    return;
  }

  // ---------- Changement de semestre ----------
  semestreSelect.addEventListener("change", () => {
    loadReleve(semestreSelect.selectedIndex);
  });

  // ---------- Télécharger en PDF ----------
  btnTelecharger.addEventListener("click", () => {
    const container = document.getElementById("releveContainer");
    const doc = new jsPDF("p", "pt", "a4");
    doc.html(container, {
      callback: function (doc) { doc.save("releve_notes.pdf"); },
      x: 20,
      y: 20,
      width: 560,
      windowWidth: 900
    });
  });

  // ---------- Charger le relevé ----------
  async function loadReleve(indexSemestre) {
    clearError();
    tableauxEl.innerHTML = "";
    titreModeleEl.textContent = "—";
    moyenneSemestreEl.textContent = "—";

    const semestres = getSemestresPourNiveau(etudiant.level);
    const semestreTexte = semestres[indexSemestre] || semestres[0];

    try {
      const url = `${API_BASE}/api/releve/etudiant/me?semestre=${encodeURIComponent(semestreTexte)}`;
      const res = await fetch(url, { credentials: "include" });
      if(!res.ok) throw new Error(`API ${res.status}`);
      const releve = await res.json();

      titreModeleEl.textContent = releve.titreModele || `${etudiant.level} - ${semestreTexte}`;
      moyenneSemestreEl.textContent = releve.moyenneSemestre ?? "—";

      if(!Array.isArray(releve.domaines) || releve.domaines.length === 0) {
        tableauxEl.innerHTML = `<p class="muted">Aucun domaine/aucune matière définie pour ce semestre.</p>`;
        return;
      }

      releve.domaines.forEach(dom => {
        const card = document.createElement("div");
        card.className = "domaine-card";

        const header = document.createElement("div");
        header.className = "domaine-header";
        header.innerHTML = `<div class="domaine-title">${escapeHtml(dom.titre||"Domaine")}</div>
                            <div class="domaine-avg">Moyenne du domaine : <strong>${dom.moyenneDomaine ?? "—"}</strong></div>`;
        card.appendChild(header);

        const table = document.createElement("table");
        table.className = "table";
        table.innerHTML = `<thead>
          <tr>
            <th>Matière</th><th>Coef</th><th>Contrôle continu 3/5</th>
            <th>Éval semestrielle 2/5</th><th>Moyenne /20</th><th>Validation</th>
          </tr></thead><tbody></tbody>`;
        const tbody = table.querySelector("tbody");

        (dom.matieres || []).forEach(m => {
          const tr = document.createElement("tr");
          const badge = (m.validation === "Validé") ? `<span class="badge ok">Validé</span>` :
                        (m.validation === "Non validé") ? `<span class="badge ko">Non validé</span>` :
                        `<span class="badge ko">❌</span>`;
          tr.innerHTML = `
            <td data-label="Matière">${escapeHtml(m.nom||"")}</td>
            <td data-label="Coef">${fmt(m.coefficient)}</td>
            <td data-label="Contrôle continu 3/5">${fmt(m.note1,"❌")}</td>
            <td data-label="Éval semestrielle 2/5">${fmt(m.note2,"❌")}</td>
            <td data-label="Moyenne /20">${fmt(m.moyenne,"—")}</td>
            <td data-label="Validation">${badge}</td>`;
          tbody.appendChild(tr);
        });

        card.appendChild(table);
        tableauxEl.appendChild(card);
      });

    } catch(err) {
      console.error(err);
      showError("Modèle non disponible pour l'instant.");
    }
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

  // Menu mobile
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

});
