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

  // Aspetta che la sezione World bosses sia presente
  await page.waitForSelector("h2.title_Tsx2");

  // Trova l'header della sezione World bosses
  const header = await page.$x(
    "//div[contains(@class,'header_hUwx')][.//h2[text()='World bosses']]"
  );

  if (!header || header.length === 0) {
    await browser.close();
    return null;
  }

  const headerDiv = header[0];

  // Controlla se è chiusa (aria-expanded="false")
  const isExpanded = await page.evaluate(
    el => el.getAttribute("aria-expanded"),
    headerDiv
  );

  if (isExpanded === "false") {
    await headerDiv.click();

    // Aspetta che si espanda
    await page.waitForFunction(() => {
      const el = document.querySelector(".header_hUwx[aria-expanded='true']");
      return !!el;
    });
  }

  // Ora gli span con l'orario ESISTONO
  const testo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".card_qufK"));
    const worldBossCard = cards.find(c =>
      c.textContent.includes("World Boss Event")
    );

    if (!worldBossCard) return null;

    const spans = Array.from(worldBossCard.querySelectorAll("span"));
    const target = spans.find(s => s.textContent.includes(","));
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

  const match = testo.match(/(\d{2}:\d{2})/);
  if (!match) {
    console.log("Formato orario non valido");
    return;
  }

  const orarioLocale = match[1];
  const orarioUTC = convertToUTC(orarioLocale);

  console.log("World Boss locale:", orarioLocale);
  console.log("World Boss UTC:", orarioUTC.toISOString().slice(11, 16));

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
client.once("ready", () => {
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
