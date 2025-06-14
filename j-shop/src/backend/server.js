const express = require("express");
const app = express();
const sequelize = require("./src/db/sequelize");

require("dotenv").config();

app.use(express.json());

// Test DB connection
sequelize
	.authenticate()
	.then(() => console.log("🟢 Connexion à la base réussie"))
	.catch((err) => console.error("🔴 Erreur de connexion :", err));

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
