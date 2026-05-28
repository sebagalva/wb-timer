import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import Tesseract from "tesseract.js";

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

  const regex = /(\d{2}):(\d{2}):(\d{2})/;
  let match = null;

  // 1️⃣ Messaggio normale
  if (msg.content) {
    match = msg.content.match(regex);
  }

  // 2️⃣ Testo negli embed (title, description, footer, fields)
  if (!match && msg.embeds.length > 0) {
    const embed = msg.embeds[0];

    match =
      embed.title?.match(regex) ||
      embed.description?.match(regex) ||
      embed.footer?.text?.match(regex) ||
      null;

    if (!match && embed.fields?.length > 0) {
      for (const f of embed.fields) {
        match = f.value?.match(regex) || f.name?.match(regex);
        if (match) break;
      }
    }
  }

  // 3️⃣ OCR su immagini negli embed (inoltri)
  if (!match && msg.embeds.length > 0) {
    const embed = msg.embeds[0];

    // SUPPORTO COMPLETO AGLI INOLTRI
    const imageUrl =
      embed.image?.url ||
      embed.thumbnail?.url ||
      embed.data?.image?.url ||   // <--- QUESTA È LA CHIAVE PER GLI INOLTRI
      null;

    if (imageUrl) {
      console.log("Eseguo OCR su immagine embed:", imageUrl);

      try {
        const result = await Tesseract.recognize(imageUrl, "eng");
        const text = result.data.text;
        console.log("OCR output:", text);

        match = text.match(regex);
      } catch (err) {
        console.error("Errore OCR:", err);
      }
    }
  }

  // 4️⃣ OCR su allegati normali
  if (!match && msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    const imageUrl = attachment.url;

    console.log("Eseguo OCR su attachment:", imageUrl);

    try {
      const result = await Tesseract.recognize(imageUrl, "eng");
      const text = result.data.text;
      console.log("OCR output:", text);

      match = text.match(regex);
    } catch (err) {
      console.error("Errore OCR:", err);
    }
  }

  // Se ancora nulla → ignora
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
