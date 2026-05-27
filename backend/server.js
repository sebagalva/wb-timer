import express from "express";
import fs from "fs";
import cron from "node-cron";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

app.use(express.json());

// GET: restituisce l’ultimo WB
app.get("/lastWB", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync("lastWB.json", "utf8"));
    res.json(data);
  } catch (err) {
    console.error("Errore lettura lastWB.json:", err);
    res.status(500).json({ error: "Errore lettura file" });
  }
});
// POST: aggiornato dal bot
app.post("/updateWB", (req, res) => {
  const { lastWB } = req.body;

 if (typeof lastWB !== "number") {
    return res.status(400).json({ error: "lastWB deve essere un numero" });
   
console.log("Ricevuto dal bot:", req.body);
  }

  fs.writeFileSync("/lastWB.json", JSON.stringify({ lastWB }), "utf8");
  console.log("Backend aggiornato:", lastWB);

  res.json({ ok: true });
});

// Cron giornaliero (opzionale)
cron.schedule("0 0 * * *", async () => {
  const data = JSON.parse(fs.readFileSync("lastWB.json", "utf8"));
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `Ultimo World Boss registrato: ${data.lastWB}`
    })
  });
});

app.listen(PORT, () => console.log("Backend attivo sulla porta", PORT));
