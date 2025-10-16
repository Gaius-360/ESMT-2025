// middlewares/checkPlatformLock.js
function checkPlatformLock(req, res, next) {
  try {
    if (process.env.PLATFORM_LOCKED === "true") {
      // Si tu veux bloquer toutes les requêtes API (JSON)
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(503).json({
          error: "Accès désactivé par le développeur",
          message: "La plateforme est temporairement verrouillée par le développeur."
        });
      }

      // Si l’utilisateur tente d’accéder depuis le navigateur
      return res
        .status(503)
        .send(`
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <title>Plateforme verrouillée</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin-top: 10%;
                background-color: #f3f4f6;
                color: #222;
              }
              .card {
                display: inline-block;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⛔ Accès désactivé</h1>
              <p>La plateforme est temporairement verrouillée par le développeur.</p>
              <p>Veuillez contacter le responsable technique pour rétablir l’accès.</p>
            </div>
          </body>
          </html>
        `);
    }

    next(); // sinon, tout continue normalement
  } catch (err) {
    console.error("Erreur middleware checkPlatformLock :", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
}

module.exports = checkPlatformLock;
