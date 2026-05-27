import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

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

client.on("messageCreate", msg => {
  if (msg.channel.id !== CHANNEL_ID) return;

  const regex = /will start at (\d{2}):(\d{2}):(\d{2})!/i;
  const match = msg.content.match(regex);
  if (!match) return;

  const [_, hh, mm, ss] = match;

  const now = new Date();
  const wbTime = new Date();
  wbTime.setHours(hh, mm, ss, 0);

  if (wbTime < now) wbTime.setDate(wbTime.getDate() + 1);

  const serial = dateToExcelSerial(wbTime);

  fs.writeFileSync("lastWB.json", JSON.stringify({ lastWB: serial }), "utf8");

  console.log("Aggiornato ultimo WB:", wbTime.toString(), "serial:", serial);
});

client.login(TOKEN);
