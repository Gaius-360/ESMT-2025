// Toggle sidebar
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
  });

  // Déconnexion
  document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/logout", { method: "POST", credentials: "include" });
    if (res.ok) window.location.href = "/backend/public/Student_Space/connexion/etudiant_connexion.html";
  } catch (err) { console.error("Erreur déconnexion :", err); }
});

  document.addEventListener("DOMContentLoaded", async () => {
    const fullname = document.getElementById("fullname");
    const birthdate = document.getElementById("birthdate");
    const level = document.getElementById("level");
    const role = document.getElementById("role");
    const gender = document.getElementById("gender");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const message = document.getElementById("message");
    const saveBtn = document.getElementById("saveBtn");

    try {
      const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/profil", { credentials: "include" });
      if (!res.ok) { message.textContent = "Veuillez vous reconnecter."; message.style.color = "red"; return; }
      const user = await res.json();
      fullname.textContent = user.fullname || "—";
      birthdate.textContent = user.birthdate ? new Date(user.birthdate).toLocaleDateString() : "—";
      level.textContent = user.level || "—";
      role.textContent = user.role || "—";
      gender.textContent = user.gender || "—";
      emailInput.value = user.email || "";
      phoneInput.value = user.phone || "";
    } catch (err) {
      console.error("Erreur fetch profil:", err);
      message.textContent = "Erreur de chargement du profil."; message.style.color = "red";
    }

    document.getElementById("updateForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      message.textContent = "";
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      if (password && password !== confirmPassword) {
        message.textContent = "Les mots de passe ne correspondent pas."; message.style.color = "red"; return;
      }
      saveBtn.disabled = true; saveBtn.textContent = "Enregistrement...";
      try {
        const res = await fetch("https://esmt-2025.onrender.com/api/etudiants/profil", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, phone, password: password || undefined }),
        });
        const data = await res.json();
        if (res.ok) {
          message.textContent = data.message || "Profil mis à jour."; message.style.color = "green";
          document.getElementById("password").value = "";
          document.getElementById("confirm-password").value = "";
        } else { message.textContent = data.message || "Erreur de mise à jour."; message.style.color = "red"; }
      } catch (err) {
        console.error(err); message.textContent = "Erreur serveur."; message.style.color = "red";
      } finally { saveBtn.disabled = false; saveBtn.textContent = "Mettre à jour"; }
    });

    // Modales
    document.querySelectorAll(".footer-link").forEach(link => {
      link.addEventListener("click", () => {
        document.getElementById("modal-" + link.dataset.modal).style.display = "flex";
      });
    });
    document.querySelectorAll(".close").forEach(btn => {
      btn.addEventListener("click", () => { btn.closest(".modal").style.display = "none"; });
    });
    window.addEventListener("click", (e) => {
      document.querySelectorAll(".modal").forEach(modal => {
        if (e.target === modal) modal.style.display = "none";
      });
    });

    const editBtn = document.getElementById("editBtn");
  const updateSection = document.getElementById("updateSection");

  editBtn.addEventListener("click", () => {
    // Toggle l'affichage
    if (updateSection.style.display === "none" || updateSection.style.display === "") {
      updateSection.style.display = "block";
      editBtn.textContent = "Fermer la modification";
    } else {
      updateSection.style.display = "none";
      editBtn.textContent = "Modifier mes informations";
    }
  });
  });