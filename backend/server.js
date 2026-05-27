import express from "express";
import fs from "fs";
import cron from "node-cron";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

app.get("/lastWB", (req, res) => {
  const data = JSON.parse(fs.readFileSync("lastWB.json", "utf8"));
  res.json(data);
});

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

app.use(express.json());

app.post("/updateWB", (req, res) => {
  const { lastWB } = req.body;
  fs.writeFileSync("lastWB.json", JSON.stringify({ lastWB }), "utf8");
  res.json({ ok: true });
});
