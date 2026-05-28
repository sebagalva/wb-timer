console.log("SERVER IN ESECUZIONE DA:", process.cwd());

import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connessione al DB PostgreSQL di Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convertitore Excel Serial → ISO UTC
function excelToDate(serial) {
  const utcMillis = (serial - 25569) * 86400 * 1000;
  return new Date(utcMillis).toISOString();
}

// GET: prossimo WB + previsioni future
app.get("/nextWB", async (req, res) => {
  try {
    const result = await pool.query("SELECT lastWB, predictions FROM wb WHERE id = 1");

    const lastWB = result.rows[0].lastwb;
    let predictions = result.rows[0].predictions || [];

    const now = Date.now();

    // Filtra solo previsioni future
    let future = predictions.filter(p => Date.parse(excelToDate(p)) > now);

    // Se non ci sono previsioni future → genera la prima usando lastWB
    if (future.length === 0) {
      const interval = 390.75 / 1440;
      const next = lastWB + interval;
      future = [next];
      predictions = [next];
      await pool.query("UPDATE wb SET predictions = $1 WHERE id = 1", [predictions]);
    }

    const nextWB_serial = future[0];
    const nextWB_date = excelToDate(nextWB_serial);

    const remaining_serial = future.slice(1);
    const remaining_date = remaining_serial.map(p => excelToDate(p));

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

// POST: aggiornamento dal bot
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

    res.json({ ok: true });
  } catch (err) {
    console.error("Errore DB UPDATE:", err);
    res.status(500).json({ error: "Errore aggiornamento DB" });
  }
});

app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));

