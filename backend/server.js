console.log("SERVER IN ESECUZIONE DA:", process.cwd());

import express from "express";
import cors from "cors";   // <--- IMPORT CORRETTO
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());           // <--- ATTIVA CORS
app.use(express.json());


// Connessione al DB PostgreSQL di Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convertitore Excel Serial → Data JS
function excelToDate(serial) {
  const utcMillis = (serial - 25569) * 86400 * 1000;
  return new Date(utcMillis).toISOString(); // <-- sempre UTC
}


// GET: restituisce ultimo WB + previsioni
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

// POST: aggiornamento dal bot
app.post("/updateWB", async (req, res) => {
  const { lastWB } = req.body;

  if (typeof lastWB !== "number") {
    return res.status(400).json({ error: "lastWB deve essere un numero" });
  }

  // Intervallo in giorni Excel (390.75 minuti)
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

// GET: prossimo WB + previsioni future rimanenti
app.get("/nextWB", async (req, res) => {
  try {
    const result = await pool.query("SELECT lastWB, predictions FROM wb WHERE id = 1");

    let predictions = result.rows[0].predictions || [];
    const now = new Date();

    // Filtra solo le previsioni future
    const future = predictions.filter(p => excelToDate(p) > now);

    // Se non ci sono previsioni future → serve un nuovo update dal bot
    if (future.length === 0) {
      return res.json({
        error: "No future forecast available. Please wait for the next update from the bot."
      });
    }

    // Il prossimo WB è il primo valore futuro
    const nextWB_serial = future[0];
    const nextWB_date = excelToDate(nextWB_serial);

    // Le restanti previsioni
    const remaining_serial = future.slice(1);
    const remaining_date = remaining_serial.map(p => excelToDate(p));

    // Aggiorna il DB eliminando le previsioni passate
    await pool.query(
      "UPDATE wb SET predictions = $1 WHERE id = 1",
      [future]
    );

    res.json({
      nextWB: {
        serial: nextWB_serial,
        date: nextWB_date
      },
      remainingPredictions: {
        serial: remaining_serial,
        date: remaining_date
      }
    });

  } catch (err) {
    console.error("Errore GET /nextWB:", err);
    res.status(500).json({ error: "Errore lettura DB" });
  }
});

// Avvio server
app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));
