console.log("SERVER IN ESECUZIONE DA:", process.cwd());

import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Connessione al DB PostgreSQL di Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// GET: restituisce l'ultimo WB
app.get("/lastWB", async (req, res) => {
    try {
        const result = await pool.query("SELECT lastWB FROM wb WHERE id = 1");
        res.json({ lastWB: result.rows[0].lastwb });
    } catch (err) {
        console.error("Errore DB GET:", err);
        res.status(500).json({ error: "Errore lettura DB" });
    }
});

// POST: aggiorna dal bot
app.post("/updateWB", async (req, res) => {
    const lastWB = req.body;

    if (typeof lastWB !== "number") {
        return res.status(400).json({ error: "lastWB deve essere un numero" });
    }

    try {
        await pool.query("UPDATE wb SET lastWB = $1 WHERE id = 1", [lastWB]);
        console.log("Backend aggiornato:", lastWB);
        res.json({ ok: true });
    } catch (err) {
        console.error("Errore DB UPDATE:", err);
        res.status(500).json({ error: "Errore aggiornamento DB" });
    }
});

app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));

