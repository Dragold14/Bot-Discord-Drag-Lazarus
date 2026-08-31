const { MessageFlags } = require("discord.js");
const { GUILD_ID } = require("../config");
const { contestState, saveContestState } = require("../state");
const { isAnyStaff } = require("../permissions");
const { safeText } = require("../helpers");
const { fetchRecordedThread } = require("../services/discord");
const { buildIncomingContestComponent } = require("../ui/contests");
const { buildNoActiveContestDM } = require("../ui/notifications");

async function debugClear(client, message) {
  const guild = client.guilds.cache.get(GUILD_ID);
  const member = guild
    ? await guild.members.fetch(message.author.id).catch(() => null)
    : null;
  if (!isAnyStaff(member)) return;

  const messages = await message.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter((msg) => msg.author.id === client.user.id);
  let deletedCount = 0;

  for (const botMessage of botMessages.values()) {
    try {
      await botMessage.delete();
      deletedCount++;
    } catch {}
  }

  const confirmation = await message.channel.send(
    `🧹 Nettoyage terminé — ${deletedCount} message(s) du bot supprimé(s).`
  );
  setTimeout(() => confirmation.delete().catch(() => {}), 3000);
}

// ============================================================
// DEBUGKICK — RESET DES RÔLES
// ============================================================

if (message.content.toLowerCase().startsWith("!debugkick")) {
  if (!message.guild) return;

  // Commande réservée au propriétaire du serveur
  if (message.author.id !== message.guild.ownerId) {
    await message.reply("❌ Cette commande est réservée au propriétaire du serveur.");
    return;
  }

  const target =
    message.mentions.members.first() ||
    message.member;

  if (!target) {
    await message.reply("❌ Membre introuvable.");
    return;
  }

  // Discord interdit au bot de modifier le propriétaire
  if (target.id === message.guild.ownerId) {
    await message.reply(
      "❌ Discord interdit au bot de modifier les rôles du propriétaire du serveur."
    );
    return;
  }

  // On garde uniquement les rôles que Discord autorise le bot à retirer.
  // @everyone et les rôles gérés par des intégrations/bots sont ignorés.
  const removableRoles = target.roles.cache.filter(
    (role) =>
      role.id !== message.guild.id &&
      !role.managed &&
      role.editable
  );

  if (removableRoles.size === 0) {
    await message.reply(
      `⚠️ Aucun rôle retirable trouvé sur ${target}.`
    );
    return;
  }

  try {
    await target.roles.remove(
      removableRoles,
      `DEBUGKICK exécuté par ${message.author.tag}`
    );

    await message.reply(
      [
        `✅ **RESET TERMINÉ**`,
        `Membre : ${target}`,
        `Rôles retirés : **${removableRoles.size}**`,
      ].join("\n")
    );

    console.log(
      `[DEBUGKICK] ${message.author.tag} a retiré ${removableRoles.size} rôle(s) à ${target.user.tag}.`
    );
  } catch (error) {
    console.error("[DEBUGKICK] Erreur :", error);

    await message.reply(
      "❌ Impossible de retirer tous les rôles. Vérifie la hiérarchie du rôle du bot."
    );
  }

  return;
}

async function handleDirectMessage(client, message) {
  try {
    if (message.author.bot || message.guild) return;

    if (message.content.trim().toLowerCase() === "!debugclear") {
      await debugClear(client, message).catch((error) => {
        console.error("[DEBUG CLEAR] Erreur :", error);
      });
      return;
    }

    if (!message.content.trim() && message.attachments.size === 0) return;

    const activeKey = contestState.activeByUser[message.author.id];
    if (!activeKey) {
      await message.author
        .send({
          components: [buildNoActiveContestDM()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
      return;
    }

    const record = contestState.records[activeKey];
    if (!record || record.status !== "open") {
      delete contestState.activeByUser[message.author.id];
      saveContestState();
      await message.author
        .send({
          components: [buildNoActiveContestDM()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
      return;
    }

    const thread = await fetchRecordedThread(client, record);
    if (!thread || thread.locked) {
      record.status = "closed";
      delete contestState.activeByUser[message.author.id];
      saveContestState();
      await message.author
        .send({
          components: [buildNoActiveContestDM()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
      return;
    }

    if (thread.archived) await thread.setArchived(false).catch(() => {});

    const content = message.content.trim()
      ? safeText(message.content.trim(), 1800)
      : "*Pièce jointe uniquement.*";
    const attachments = [...message.attachments.values()].map(
      (attachment) =>
        `[${safeText(attachment.name || "Pièce jointe", 120)}](${attachment.url})`
    );

    await thread.send({
      components: [
        buildIncomingContestComponent(
          message.author,
          content,
          attachments,
          record.requestId
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    await message.react("📩").catch(() => {});
  } catch (error) {
    console.error("[DM] Erreur :", error);
  }
}

module.exports = { handleDirectMessage };
