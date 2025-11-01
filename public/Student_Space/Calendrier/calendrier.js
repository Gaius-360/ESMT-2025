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

  async function registerPush() {
if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
console.log('Push non supporté');
return;
}


try {
const registration = await navigator.serviceWorker.register('/sw.js');
const permission = await Notification.requestPermission();
if (permission !== 'granted') return;


const vapidPublicKey = 'BFAgfeacAeGdQxHsp5PVTTMXunTRoE9PwU6thjb1p2ZDit-1HUY_eJpU-xZii8VH8O5kiua7hEs5xPq0Civqnw8'; // remplacer par la clé publique réelle
const subscription = await registration.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
});


// envoyer au backend
await fetch('https://esmt-2025.onrender.com/api/push/subscribe', {
method: 'POST',
credentials: 'include',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(subscription)
});


console.log('Abonnement push OK');
} catch (err) {
console.error('Erreur registerPush', err);
}
}


function urlBase64ToUint8Array(base64String) {
const padding = '='.repeat((4 - base64String.length % 4) % 4);
const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
const rawData = atob(base64);
return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


// Auto-register
registerPush();

 // Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "../connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

  // Menu mobile
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
});
