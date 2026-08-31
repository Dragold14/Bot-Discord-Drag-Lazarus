const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = require("./config");

const commands = [
  new SlashCommandBuilder()
    .setName("accreditations")
    .setDescription("Publie le terminal du Bureau des Accréditations.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((command) => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });
  console.log("Commande /accreditations enregistrée.");
}

module.exports = { registerCommands };
