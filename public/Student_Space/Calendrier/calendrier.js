document.addEventListener('DOMContentLoaded', () => {
  const voirBtn = document.getElementById('voirEmploi');
  const fermerBtn = document.getElementById('fermer');
  const logoutBtn = document.getElementById('logoutBtn');
  const emploiContainer = document.getElementById('emploiContainer');
  const downloadLink = document.getElementById('downloadLink');
  const pdfViewer = document.getElementById('pdfViewer');

  // Fonction pour afficher le PDF via PDF.js
  async function renderPDF(blob) {
    pdfViewer.innerHTML = '';
    emploiContainer.style.display = 'flex';
    const url = URL.createObjectURL(blob);
    const pdf = await pdfjsLib.getDocument(url).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      pdfViewer.appendChild(canvas);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }
  }

  // Voir PDF
  voirBtn?.addEventListener('click', async () => {
    const niveau = document.getElementById('niveau').value;
    if (!niveau) return alert('Veuillez sélectionner un niveau.');

    try {
      const res = await fetch(`https://esmt-2025.onrender.com/api/emplois/pdf/${encodeURIComponent(niveau)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return alert(data.message || "Aucun emploi trouvé pour ce niveau.");
      }

      const blob = await res.blob();
      renderPDF(blob);
      downloadLink.href = URL.createObjectURL(blob);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement de l'emploi du temps.");
    }
  });

  // Fermer PDF
  fermerBtn?.addEventListener('click', () => {
    pdfViewer.innerHTML = '';
    emploiContainer.style.display = 'none';
  });

 // Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "./connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

  // Menu mobile
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
});
