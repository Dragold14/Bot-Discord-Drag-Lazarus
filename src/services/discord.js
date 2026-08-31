const { PermissionFlagsBits } = require("discord.js");
const { GUILD_ID, REQUEST_CHANNEL_ID } = require("../config");

async function getRequestChannel(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return null;
  return guild.channels.fetch(REQUEST_CHANNEL_ID).catch(() => null);
}

async function getFreshRequestMessage(client, messageId) {
  const channel = await getRequestChannel(client);
  if (!channel || !channel.isTextBased()) return null;
  return channel.messages
    .fetch({ message: messageId, force: true })
    .catch(() => null);
}

async function fetchRecordedThread(client, record) {
  if (!record?.threadId) return null;
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return null;
  return guild.channels.fetch(record.threadId).catch(() => null);
}

async function auditRequestChannelSecurity(client) {
  const channel = await getRequestChannel(client);
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!channel || !guild || !channel.permissionsFor) return;

  const everyonePermissions = channel.permissionsFor(guild.roles.everyone);
  if (everyonePermissions?.has(PermissionFlagsBits.ViewChannel)) {
    console.warn(
      "[SÉCURITÉ] REQUEST_CHANNEL_ID est visible par @everyone. Les dossiers et fils de réexamen peuvent exposer des informations internes."
    );
  }
}

module.exports = {
  getRequestChannel,
  getFreshRequestMessage,
  fetchRecordedThread,
  auditRequestChannelSecurity,
};
