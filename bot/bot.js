import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const BACKEND_URL = process.env.BACKEND_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function dateToExcelSerial(date) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const diffMs = date.getTime() - excelEpoch.getTime();
  return diffMs / (24 * 60 * 60 * 1000);
}

client.on("messageCreate", async msg => {
  console.log("Messaggio ricevuto:", msg.content || msg.embeds[0]?.description);

  if (msg.channel.id !== CHANNEL_ID) return;

  // Regex per orario hh:mm:ss
  const regex = /(\d{2}):(\d{2}):(\d{2})/;

  let match = null;

  // 1️⃣ Prova a leggere dal messaggio normale
  if (msg.content) {
    match = msg.content.match(regex);
  }

  // 2️⃣ Se non trovato, prova a leggere dagli embed
  if (!match && msg.embeds.length > 0) {
    const embed = msg.embeds[0];

    match =
      embed.title?.match(regex) ||
      embed.description?.match(regex) ||
      null;
  }

  // Se ancora nulla, ignora
  if (!match) return;

  const [_, hh, mm, ss] = match;

  const now = new Date();
  const wbTime = new Date();
  wbTime.setHours(hh, mm, ss, 0);

  if (wbTime < now) wbTime.setDate(wbTime.getDate() + 1);

  const serial = dateToExcelSerial(wbTime);

  console.log("Invio al backend:", serial);

  await fetch(`${BACKEND_URL}/updateWB`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastWB: serial })
  });

  console.log("Aggiornato ultimo WB:", wbTime.toString(), "serial:", serial);
});


client.login(TOKEN);
