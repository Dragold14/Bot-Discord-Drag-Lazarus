const {Events, ActivityType,} = require("discord.js");
const { GameDig } = require("gamedig");
const { client } = require("./src/client");
const { registerCommands } = require("./src/registerCommands");
const { auditRequestChannelSecurity } = require("./src/services/discord");
const { handleInteraction } = require("./src/handlers/interactions");
const { handleDirectMessage, handleGuildMessage,} = require("./src/handlers/messages");
const { DISCORD_TOKEN } = require("./src/config");

client.on(Events.InteractionCreate, (interaction) =>
  handleInteraction(client, interaction)
);

client.on("messageCreate", async (message) => {
  if (message.guild) {
    await handleGuildMessage(
      client,
      message
    );

    return;
  }

  await handleDirectMessage(
    client,
    message
  );
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[READY] Connecté en tant que ${readyClient.user.tag}.`);

  await auditRequestChannelSecurity(client).catch((error) => {
    console.error("[SÉCURITÉ] Audit impossible :", error);
  });

  await updateGmodStatus();

  setInterval(
    updateGmodStatus,
    Number(process.env.GMOD_STATUS_INTERVAL || 30000)
  );
});

(async () => {
  try {
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("[STARTUP] Démarrage impossible :", error);
    process.exitCode = 1;
  }
})();

async function updateGmodStatus() {
  try {
    const server = await GameDig.query({
      type: "garrysmod",
      host: process.env.GMOD_HOST,
      port: Number(process.env.GMOD_PORT || 27015),
    });

    const serverName =
      process.env.GMOD_SERVER_NAME || "CMO";

    client.user.setPresence({
      activities: [
        {
          name: `🌐 ${serverName} • ${server.numplayers} joueurs en ligne`,
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });
  } catch (error) {
    client.user.setPresence({
      activities: [
        {
          name: "🌐 CMO • Serveur hors ligne",
          type: ActivityType.Watching,
        },
      ],
      status: "dnd",
    });

    console.error(
      "[GMOD] Serveur inaccessible :",
      error.message
    );
  }
}