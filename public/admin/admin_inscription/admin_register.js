document.getElementById("inscription-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const message = document.getElementById("message");
  const submitBtn = document.getElementById("submit-btn");

  if (!email || !password || !confirmPassword) {
    message.textContent = "Tous les champs sont requis.";
    message.style.color = "red";
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = "Les mots de passe ne correspondent pas.";
    message.style.color = "red";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Inscription en cours...";
  message.textContent = "";

  try {
    const response = await fetch("http://localhost:5000/api/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = data.message || "Inscription réussie.";
      message.style.color = "green";
      setTimeout(() => {
        window.location.href = "../admin_connexion/admin_connexion.html";
      }, 1000);
    } else {
      message.textContent = data.message || "Erreur lors de l'inscription.";
      message.style.color = "red";
    }
  } catch (error) {
    console.error("Erreur serveur :", error);
    message.textContent = "Erreur de connexion au serveur.";
    message.style.color = "red";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "S'inscrire";
  }
});
