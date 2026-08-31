const { MessageFlags } = require("discord.js");
const { buildAccreditationPanel } = require("../ui/panel");
const { handleRequestInteraction } = require("./requestInteractions");
const { handleContestInteraction } = require("./contestInteractions");
const { logDisabledRequests } = require("../catalog");

let configLogged = false;

async function handleInteraction(client, interaction) {
  try {
    if (!configLogged) {
      logDisabledRequests();
      configLogged = true;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "accreditations") return;

      await interaction.reply({
        content: "Terminal d'accréditation publié.",
        flags: MessageFlags.Ephemeral,
      });

      await interaction.channel.send({
        components: buildAccreditationPanel(),
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (await handleRequestInteraction(client, interaction)) return;
    if (await handleContestInteraction(client, interaction)) return;
  } catch (error) {
    console.error("[INTERACTION] Erreur :", error);
    const payload = {
      content: `❌ Une erreur interne est survenue. ${error?.message || "Vérifiez la console du bot."}`.slice(0, 1900),
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

module.exports = { handleInteraction };
