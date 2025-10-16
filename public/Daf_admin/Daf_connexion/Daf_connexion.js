document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("https://esmt-2025.onrender.com/api/adminDaf/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur connexion");

    window.location.href = "../Space_Daf/admin_daf.html";
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
});
