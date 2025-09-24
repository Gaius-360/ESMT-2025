document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const fullname = document.getElementById("fullname").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const birthdate = document.getElementById("birthdate").value;
  const gender = document.getElementById("gender").value;
  const level = document.getElementById("level").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  try {
    const response = await fetch("https://esmt-2025.onrender.com/api/etudiants/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        fullname,
        email,
        phone,
        birthdate,
        gender,
        level,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      message.style.color = "green";
      message.textContent = "Inscription réussie ! Redirection...";
      setTimeout(() => {
        window.location.href = "../connexion/etudiant_connexion.html";
      }, 1500);
    } else {
      message.style.color = "red";
      message.textContent = data.message || "Erreur lors de l'inscription.";
    }
  } catch (err) {
    console.error("Erreur serveur :", err);
    message.style.color = "red";
    message.textContent = "Erreur de connexion au serveur.";
  }
  

});


