document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("https://esmt-2025.onrender.com/api/admin/login", {
        method: "POST",
        credentials: "include", // important pour les cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Connexion réussie
        window.location.href = "../space_admin/admin_dashboard/admin_dashboard.html"; // redirection
      } else {
        message.textContent = data.message || "Échec de la connexion.";
      }
    } catch (error) {
      console.error("Erreur :", error);
      message.textContent = "Une erreur s’est produite.";
    }
  });
});
