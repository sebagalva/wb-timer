import { Client, GatewayIntentBits } from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN;

// Canale dove inoltri i messaggi
const FORWARD_CHANNEL_ID = process.env.FORWARD_CHANNEL_ID;

// Canale dove deve essere reinviato il messaggio ricostruito
const WB_CHANNEL_ID = process.env.WB_CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("messageCreate", async msg => {
  // Ignora messaggi non nel canale di inoltro
  if (msg.channel.id !== FORWARD_CHANNEL_ID) return;

  // Gli inoltri hanno embed con riferimento al messaggio originale
  if (!msg.embeds.length) return;

  const embed = msg.embeds[0];

  // Gli inoltri contengono un link al messaggio originale
  const originalMessageUrl = embed.url;

  if (!originalMessageUrl) {
    console.log("Nessun URL originale trovato nell'inoltro");
    return;
  }

  // Estraggo serverID / channelID / messageID
  const match = originalMessageUrl.match(/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);

  if (!match) {
    console.log("Impossibile estrarre ID dal link:", originalMessageUrl);
    return;
  }

  const [, guildId, channelId, messageId] = match;

  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    const originalMessage = await channel.messages.fetch(messageId);

    // Reinvia embed originale nel canale WB
    const wbChannel = await client.channels.fetch(WB_CHANNEL_ID);

    if (originalMessage.embeds.length > 0) {
      await wbChannel.send({ embeds: originalMessage.embeds });
      console.log("Embed originale reinviato con successo");
    } else {
      await wbChannel.send(originalMessage.content || "Messaggio originale senza contenuto");
      console.log("Messaggio testuale reinviato");
    }

  } catch (err) {
    console.error("Errore nel recupero del messaggio originale:", err);
  }
});

client.login(TOKEN);
