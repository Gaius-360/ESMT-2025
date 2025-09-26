const uploadForm = document.getElementById("uploadForm");
const result = document.getElementById("result");
const pdfViewer = document.getElementById("pdfViewer");

// Upload PDF
uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/emplois/import", {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const data = await res.json();
    result.innerText = JSON.stringify(data, null, 2);
    if(!res.ok){ alert(data.message || "Erreur lors de l'import."); return; }
    alert("PDF importé avec succès ✅");
  } catch(err){
    console.error(err);
    alert("Erreur réseau lors de l'import.");
  }
});

// PDF.js rendering pour une seule page
async function renderPDF(blob){
  pdfViewer.innerHTML = "";
  pdfViewer.style.display = "block";
  const url = URL.createObjectURL(blob);
  const pdf = await pdfjsLib.getDocument(url).promise;

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({scale: 1.2});

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  pdfViewer.appendChild(canvas);
  await page.render({canvasContext: ctx, viewport: viewport}).promise;
}

// Voir PDF
document.getElementById("voirPdf").addEventListener("click", async () => {
  const niveau = document.getElementById("niveauPreview").value;
  if(!niveau){ alert("Veuillez choisir un niveau"); return; }
  try {
    const res = await fetch(`https://esmt-2025.onrender.com/api/emplois/pdf/${encodeURIComponent(niveau)}`, {credentials:"include"});
    if(!res.ok){ alert("Aucun emploi trouvé pour ce niveau."); return; }
    const blob = await res.blob();
    renderPDF(blob);
    document.getElementById("fermerPdf").style.display="inline-block";
  } catch(err){ console.error(err); alert("Erreur lors du chargement du PDF."); }
});

// Fermer PDF
document.getElementById("fermerPdf").addEventListener("click", ()=>{
  pdfViewer.style.display="none";
  pdfViewer.innerHTML="";
  document.getElementById("fermerPdf").style.display="none";
});

// Menu mobile
const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
toggle.addEventListener("click",()=> sidebar.classList.toggle("open"));

document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        const isAdminPage = window.location.pathname.includes("admin");
        const url = isAdminPage
          ? "https://esmt-2025.onrender.com/api/admin/logout"
          : "https://esmt-2025.onrender.com/api/etudiants/logout";

        const res = await fetch(url, {
          method: "POST",
          credentials: "include"
        });

        if (res.ok) {
          window.location.href = isAdminPage 
            ? "/backend/public/admin/admin_connexion/admin_connexion.html" 
            : "/login.html";
        }
      } catch (err) {
        console.error("Erreur déconnexion :", err);
      }
    });