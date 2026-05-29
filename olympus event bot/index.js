require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const puppeteer = require("puppeteer");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const URL = "https://wiki.olympusgg.com/scheduled-events";

let ultimoOrarioUTC = null;

function convertToUTC(orarioLocale) {
  const [h, m] = orarioLocale.split(":").map(Number);
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000);
}

async function controllaOrario() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });

  await page.waitForSelector("span");

  const testo = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll("span"));
    const target = spans.find(s => s.textContent.includes(","));
    return target ? target.textContent.trim() : null;
  });

  await browser.close();

  if (!testo) {
    console.log("Orario non trovato");
    return;
  }

  const match = testo.match(/(\d{2}:\d{2})/);
  if (!match) {
    console.log("Formato orario non valido");
    return;
  }

  const orarioLocale = match[1];
  const orarioUTC = convertToUTC(orarioLocale);

  console.log("Orario locale:", orarioLocale);
  console.log("Orario UTC:", orarioUTC.toISOString().slice(11, 16));

  if (ultimoOrarioUTC && orarioUTC.getTime() !== ultimoOrarioUTC.getTime()) {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(
        `🔔 L'orario dell'evento è cambiato!\nLocale: **${orarioLocale}**\nUTC: **${orarioUTC.toISOString().slice(11, 16)}**`
      );
    }
  }

  ultimoOrarioUTC = orarioUTC;
}

client.once("ready", () => {
  console.log(`Bot avviato come ${client.user.tag}`);

  cron.schedule("0 9 * * *", () => {
    console.log("Controllo giornaliero...");
    controllaOrario();
  });

  controllaOrario();
});

client.login(process.env.DISCORD_TOKEN);
