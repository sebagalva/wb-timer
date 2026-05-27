import express from "express";
import fs from "fs";
import cron from "node-cron";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK = "https://discord.com/api/webhooks/1509210115557822464/LrPeLPH6SamHOgzryBe_Vrn-EQpRpK0z8DFmQ5s7fZxiS-A8bCIAr9GUNuuIfY1k_OC_";

app.get("/lastWB", (req, res) => {
  const data = JSON.parse(fs.readFileSync("lastWB.json"));
  res.json(data);
});

// Invio automatico ogni giorno alle 00:01
cron.schedule("1 0 * * *", async () => {
  const { lastWB } = JSON.parse(fs.readFileSync("lastWB.json"));

  const message = {
    content: `📅 Aggiornamento automatico WB\nUltimo WB registrato: ${lastWB}`
  };

  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message)
  });

  console.log("Previsioni inviate automaticamente.");
});

app.listen(PORT, () => console.log("Backend attivo su porta", PORT));
