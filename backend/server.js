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

// POST: aggiornamento dal bot
// Ora interpreta l'orario come "oggi" in UTC
app.post("/updateWB", async (req, res) => {
  const { lastWB } = req.body;

  if (typeof lastWB !== "number") {
    return res.status(400).json({ error: "lastWB deve essere un numero" });
  }

  // 1. Converti il serial in orario UTC
  const wbDate = new Date((lastWB - 25569) * 86400 * 1000);

  // 2. Prendi la data UTC di oggi
  const now = new Date();
  const todayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    wbDate.getUTCHours(),
    wbDate.getUTCMinutes(),
    wbDate.getUTCSeconds()
  ));

  // 3. Converti la data corretta in serial Excel
  const correctedSerial = (todayUTC.getTime() / 86400000) + 25569;

  try {
    await pool.query(
      "UPDATE wb SET lastWB = $1 WHERE id = 1",
      [correctedSerial]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Errore DB UPDATE:", err);
    res.status(500).json({ error: "Errore aggiornamento DB" });
  }
});

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

app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));
