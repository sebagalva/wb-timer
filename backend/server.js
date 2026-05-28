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
    const result = await pool.query("SELECT lastWB FROM wb WHERE id = 1");

    const lastWB = result.rows[0].lastwb;
    const now = Date.now();
    const interval = 390.75 / 1440;

    let next;

    // Caso 1 — Il WB inviato dal bot è nel FUTURO → è il prossimo WB
    if (Date.parse(excelToDate(lastWB)) > now) {
      next = lastWB;
    }

    // Caso 2 — Il WB è nel PASSATO → calcola il primo evento futuro
    else {
      next = lastWB + interval;

      // Se anche questo è passato, continua a generare finché trovi un futuro
      while (Date.parse(excelToDate(next)) <= now) {
        next += interval;
      }
    }

    // Genera altre 14 previsioni future
    const remaining = [];
    let temp = next;
    for (let i = 1; i <= 14; i++) {
      temp += interval;
      remaining.push(temp);
    }

    // Salva nel DB
    await pool.query(
      "UPDATE wb SET predictions = $1 WHERE id = 1",
      [[next, ...remaining]]
    );

    // Risposta API
    res.json({
      nextWB: {
        serial: next,
        date: excelToDate(next)
      },
      remainingPredictions: {
        serial: remaining,
        date: remaining.map(excelToDate)
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

  // Salva solo lastWB, il resto lo calcola /nextWB
  try {
    await pool.query(
      "UPDATE wb SET lastWB = $1 WHERE id = 1",
      [lastWB]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Errore DB UPDATE:", err);
    res.status(500).json({ error: "Errore aggiornamento DB" });
  }
});

app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));
