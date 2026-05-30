require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const puppeteer = require("puppeteer");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const URL = "https://wiki.olympusgg.com/scheduled-events";

let ultimoOrarioUTC = null;

// Converte hh:mm locale → UTC
function convertToUTC(orarioLocale) {
  const [h, m] = orarioLocale.split(":").map(Number);
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000);
}

// Estrae SOLO l’orario del World Boss
async function estraiOrarioWorldBoss() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });

  // Aspetta che la sezione sia caricata
  await page.waitForSelector(".header_hUwx");

  // Trova la sezione "World bosses"
  const sectionHandle = await page.evaluateHandle(() => {
    const headers = Array.from(document.querySelectorAll(".header_hUwx"));
    return headers.find(h => h.innerText.includes("World bosses")) || null;
  });

  if (!sectionHandle) {
    await browser.close();
    return null;
  }

  // Espandi se chiusa
  const isExpanded = await page.evaluate(
    el => el.getAttribute("aria-expanded"),
    sectionHandle
  );

  if (isExpanded === "false") {
    await sectionHandle.click();
    await page.waitForFunction(() => {
      const el = document.querySelector(".header_hUwx[aria-expanded='true']");
      return !!el;
    });
  }

  // Ora estrai l'orario SOLO dalla sezione World bosses
  const testo = await page.evaluate(() => {
    const section = Array.from(document.querySelectorAll(".header_hUwx"))
      .find(h => h.innerText.includes("World bosses"))
      ?.parentElement;

    if (!section) return null;

    // Cerca la stringa tipo: "30 mag, 18:42 → 30 mag, 19:12"
    const spans = Array.from(section.querySelectorAll("span"));
    const target = spans.find(s => s.textContent.includes("→"));
    return target ? target.textContent.trim() : null;
  });

  await browser.close();
  return testo;
}

// Controllo principale
async function controllaWorldBoss() {
  const testo = await estraiOrarioWorldBoss();

  if (!testo) {
    console.log("World Boss non trovato");
    return;
  }

  console.log("Testo estratto:", testo);

  // Prende solo la parte prima della freccia
  const parteSinistra = testo.split("→")[0];

  // Estrae l'orario locale (es: "18:42")
  const match = parteSinistra.match(/(\d{2}:\d{2})/);

  if (!match) {
    console.log("Formato orario non valido");
    return;
  }

  const orarioLocale = match[1];
  const orarioUTC = convertToUTC(orarioLocale);

  console.log("World Boss locale:", orarioLocale);
  console.log("World Boss UTC:", orarioUTC.toISOString().slice(11, 16));
  console.log("Ultimo salvato:", ultimoOrarioUTC?.toISOString().slice(11, 16));

  // Notifica solo se l’orario è cambiato
  if (ultimoOrarioUTC && orarioUTC.getTime() !== ultimoOrarioUTC.getTime()) {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(
        `⚔️ **World Boss aggiornato!**\nLocale: **${orarioLocale}**\nUTC: **${orarioUTC.toISOString().slice(11, 16)}**`
      );
    }
  }

  ultimoOrarioUTC = orarioUTC;
}

// Avvio bot
client.once("clientReady", () => {
  console.log(`Bot avviato come ${client.user.tag}`);

  // Controllo giornaliero alle 09:00
  cron.schedule("0 9 * * *", () => {
    console.log("Controllo giornaliero World Boss...");
    controllaWorldBoss();
  });

  // Primo controllo immediato
  controllaWorldBoss();
});

client.login(process.env.DISCORD_TOKEN);
