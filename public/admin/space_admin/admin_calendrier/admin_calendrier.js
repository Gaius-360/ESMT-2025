const uploadForm = document.getElementById("uploadForm");
const result = document.getElementById("result");
const pdfViewer = document.getElementById("pdfViewer");

// Upload PDF
uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  try {
    const res = await fetch("http://localhost:5000/api/emplois/import", {
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
    const res = await fetch(`http://localhost:5000/api/emplois/pdf/${encodeURIComponent(niveau)}`, {credentials:"include"});
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
