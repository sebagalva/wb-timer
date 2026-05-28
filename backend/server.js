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
function excelToDate(serial) {
    return new Date((serial - 25569) * 86400 * 1000);
}

app.get("/lastWB", async (req, res) => {
    try {
        const result = await pool.query("SELECT lastWB, predictions FROM wb WHERE id = 1");

        const lastWB = result.rows[0].lastwb;
        const predictions = result.rows[0].predictions;

        res.json({
            lastWB_serial: lastWB,
            lastWB_date: excelToDate(lastWB),

            predictions_serial: predictions,
            predictions_date: predictions.map(p => excelToDate(p))
        });

    } catch (err) {
        console.error("Errore DB GET:", err);
        res.status(500).json({ error: "Errore lettura DB" });
    }
});


// POST: aggiorna dal bot
app.post("/updateWB", async (req, res) => {
    const { lastWB } = req.body;

    if (typeof lastWB !== "number") {
        return res.status(400).json({ error: "lastWB deve essere un numero" });
    }

    const interval = 390.75 / 1440;
    const predictions = [];

    for (let i = 1; i <= 10; i++) {
        predictions.push(lastWB + interval * i);
    }

    try {
        await pool.query(
            "UPDATE wb SET lastWB = $1, predictions = $2 WHERE id = 1",
            [lastWB, predictions]
        );

        console.log("Backend aggiornato:", lastWB, "Previsioni:", predictions);
        res.json({ ok: true });
    } catch (err) {
        console.error("Errore DB UPDATE:", err);
        res.status(500).json({ error: "Errore aggiornamento DB" });
    }
});



app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));

