// releve_preview.js

document.addEventListener("DOMContentLoaded", () => {
  const titreModeleEl = document.getElementById("titreModele");
  const moyenneSemestreEl = document.getElementById("moyenneSemestre");
  const tableauxEl = document.getElementById("tableaux");
  const retourBtn = document.getElementById("retourAdminBtn");
  const downloadBtn = document.getElementById("downloadPDF");

  // 🔹 Récupération du modèle depuis localStorage
  const model = JSON.parse(localStorage.getItem("modele_preview"));
  if (!model) {
    tableauxEl.innerHTML =
      "<p style='color:red; text-align:center;'>⚠️ Aucun modèle à afficher. Veuillez d’abord enregistrer un modèle depuis l’espace administrateur.</p>";
    return;
  }

  // 🔹 Remplir le titre et les infos
  titreModeleEl.textContent = model.titre || "Modèle sans titre";
  moyenneSemestreEl.textContent = "—";

  // 🔹 Rendu des domaines et matières
  model.domaines?.forEach((dom) => {
    const card = document.createElement("div");
    card.className = "domaine-card";

    const header = document.createElement("div");
    header.className = "domaine-header";
    header.innerHTML = `
      <div class="domaine-title">${dom.titre || "Domaine sans titre"}</div>
      <div class="domaine-avg">Moyenne du domaine : —</div>
    `;
    card.appendChild(header);

    const table = document.createElement("table");
    table.className = "table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Matière</th>
          <th>Coef</th>
          <th>Contrôle continu 3/5</th>
          <th>Évaluation semestrielle 2/5</th>
          <th>Moyenne /20</th>
          <th>Validation</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    (dom.matieres || []).forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.nom || "—"}</td>
        <td>${m.coefficient || "—"}</td>
        <td>❌</td>
        <td>❌</td>
        <td>—</td>
        <td><span class="badge ko">❌</span></td>
      `;
      tbody.appendChild(tr);
    });

    card.appendChild(table);
    tableauxEl.appendChild(card);
  });


  // récupère le bouton (assure-toi que l'ID est correct dans le HTML)
retourBtn.addEventListener("click", () => {
  // 1) Si la fenêtre a été ouverte par script depuis l'admin -> on peut la fermer
  if (window.opener && !window.opener.closed) {
    try {
      // optionnel : redonne le focus à la fenêtre parente
      window.opener.focus();
    } catch (e) {
      // ignore
    }
    // ferme l'onglet/fenêtre actuelle (fonctionnera si la page a été ouverte par script)
    window.close();
    return;
  }

  // 2) Si on a un referrer sur le même domaine -> on revient en arrière
  try {
    const ref = document.referrer;
    if (ref && ref.startsWith(location.origin)) {
      window.location.href = ref;
      return;
    }
  } catch (e) {
    // ignore
  }

  // 3) Fallback : rediriger vers la page admin connue (chemin relatif ou absolu selon ton projet)
  // Remplace le chemin ci-dessous par le chemin réel vers ta page d'édition admin si nécessaire
  window.location.href = "./admin_releve.html";
});

  // 🔹 Téléchargement PDF
  downloadBtn.addEventListener("click", async () => {
    const element = document.getElementById("container");
    const opt = {
      margin: 0.5,
      filename: `${model.titre || "modele_releve"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
  });
});
