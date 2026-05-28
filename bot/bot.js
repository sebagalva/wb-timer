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
  console.log("Messaggio ricevuto:", msg.content);

  if (msg.channel.id !== CHANNEL_ID) return;

  const regex = /will start at (\d{2}):(\d{2}):(\d{2})/i;
  const match = msg.content.match(regex);
  if (!match) return;

  const [_, hh, mm, ss] = match;

  const now = new Date();
  const wbTime = new Date();
  wbTime.setHours(hh, mm, ss, 0);

  if (wbTime < now) wbTime.setDate(wbTime.getDate() + 1);

  const serial = dateToExcelSerial(wbTime);

  console.log("Invio al backend:", serial);

await fetch(`${process.env.BACKEND_URL}/updateWB`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastWB: numero })
});


  console.log("Aggiornato ultimo WB:", wbTime.toString(), "serial:", serial);
});

client.login(TOKEN);
