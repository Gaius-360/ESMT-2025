document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  try {
    const response = await fetch("https://esmt-2025.onrender.com/api/etudiants/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // important pour envoyer le cookie
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      message.style.color = "green";
      message.textContent = "Connexion réussie ! Redirection...";
      setTimeout(() => {
        window.location.href = "../dashboard/dashboard_protected.html"; // redirection après connexion
      }, 1000);
    } else {
      message.style.color = "red";
      message.textContent = data.message || "Échec de la connexion.";
    }
  } catch (err) {
    console.error("Erreur serveur :", err);
    message.style.color = "red";
    message.textContent = "Erreur de connexion au serveur.";
  }
});
