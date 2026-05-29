require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const URL = "https://wiki.olympusgg.com/scheduled-events";
const SELECTOR = ".event-time span";

let ultimoOrarioUTC = null;

function convertToUTC(orarioLocale) {
    const [h, m] = orarioLocale.split(":").map(Number);

    const now = new Date();
    const local = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m
    );

    return new Date(local.getTime() - local.getTimezoneOffset() * 60000);
}

async function controllaOrario() {
    try {
        const response = await axios.get(URL);
        const $ = cheerio.load(response.data);

        const testo = $(SELECTOR).first().text().trim();

        const match = testo.match(/(\d{2}:\d{2})/);
        if (!match) {
            console.log("Orario non trovato");
            return;
        }

        const orarioLocale = match[1];
        console.log("Orario locale:", orarioLocale);

        const orarioUTC = convertToUTC(orarioLocale);
        console.log("Orario UTC:", orarioUTC.toISOString().slice(11, 16));

        if (ultimoOrarioUTC && orarioUTC.getTime() !== ultimoOrarioUTC.getTime()) {
            const channel = client.channels.cache.get(process.env.CHANNEL_ID);
            channel.send(
                `🔔 L'orario dell'evento è cambiato!\nLocale: **${orarioLocale}**\nUTC: **${orarioUTC.toISOString().slice(11, 16)}**`
            );
        }

        ultimoOrarioUTC = orarioUTC;

    } catch (err) {
        console.error("Errore durante il controllo:", err);
    }
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
