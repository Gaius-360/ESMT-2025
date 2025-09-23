// frontend/admin/space_admin/admin_protect.js
fetch("http://localhost:5000/api/auth/me", {
  credentials: "include"
})
  .then(res => res.json())
  .then(data => {
    if (!data.user || data.user.role !== "admin") {
      // Redirige vers la connexion admin si non autorisé
      window.location.href = "../admin_connexion/admin_login.html";
    }
  })
  .catch(() => {
    window.location.href = "../admin_connexion/admin_login.html";
  });
