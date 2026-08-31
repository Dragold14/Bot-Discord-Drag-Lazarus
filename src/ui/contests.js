const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { COLORS } = require("../config");
const { text, separator, safeText, formatDateTimeFR } = require("../helpers");

function buildContestThreadName(user, request, requestId) {
  const username = user.username
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 25);
  const typeName = request.key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  return `contestation-${username}-${typeName}-${requestId.slice(-6)}`.slice(0, 95);
}

function buildContestHeaderComponent(user, request, requestId) {
  return new ContainerBuilder()
    .setAccentColor(COLORS.OTHER_YELLOW)
    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",
          "### DOSSIER DE RÉEXAMEN",
          "",
          "**Demandeur**",
          `<@${user.id}>`,
          "",
          "**Décision contestée**",
          `\`${request.label}\``,
          "",
          "**Dossier source**",
          `\`${requestId}\``,
        ].join("\n")
      )
    )
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(
      text(
        [
          "### // ÉTAT DU RÉEXAMEN",
          "🟠 **RÉEXAMEN EN COURS**",
          "",
          "`REVIEW STATUS : PENDING`",
        ].join("\n")
      )
    )
    .addSeparatorComponents(separator())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`contest_accept:${user.id}:${requestId}`)
          .setLabel("ACCEPTER LA DEMANDE")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`contest_reply:${user.id}:${requestId}`)
          .setLabel("RÉPONDRE")
          .setEmoji("💬")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`contest_close:${user.id}:${requestId}`)
          .setLabel("REFUSER LE RÉEXAMEN")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      )
    );
}

function buildIncomingContestComponent(user, content, attachments, requestId) {
  const container = new ContainerBuilder()
    .setAccentColor(COLORS.CMO_BLUE)
    .addTextDisplayComponents(
      text([`### 📥 ${safeText(user.username, 80)}`, "", content].join("\n"))
    );

  if (attachments.length > 0) {
    container
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(attachments.join("\n")));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`contest_reply:${user.id}:${requestId}`)
        .setLabel("RÉPONDRE")
        .setEmoji("💬")
        .setStyle(ButtonStyle.Primary)
    )
  );
  return container;
}

function buildOutgoingContestComponent(message, moderator) {
  return new ContainerBuilder()
    .setAccentColor(COLORS.STAFF_RED)
    .addTextDisplayComponents(
      text(
        [
          "### 📤 BUREAU",
          "",
          message,
          "",
          `-# ${safeText(moderator.username, 80)} — transmis au joueur`,
        ].join("\n")
      )
    );
}

function buildContestAcceptedStaffComponent(moderator) {
  const processedAt = formatDateTimeFR();
  return new ContainerBuilder()
    .setAccentColor(COLORS.SUCCESS)
    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",
          "### RÉEXAMEN DU DOSSIER",
          "",
          "🟢 **RÉEXAMEN ACCEPTÉ — DEMANDE VALIDÉE**",
          "",
          `**Décision le :** \`${processedAt}\``,
          `**Validé par :** <@${moderator.id}>`,
          "",
          "`REVIEW STATUS : ACCEPTED`",
          "`DOSSIER : CLOSED`",
        ].join("\n")
      )
    );
}

function buildContestClosedComponent(moderator) {
  const processedAt = formatDateTimeFR();
  return new ContainerBuilder()
    .setAccentColor(COLORS.STAFF_RED)
    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",
          "### RÉEXAMEN DU DOSSIER",
          "",
          "🔴 **RÉEXAMEN REFUSÉ**",
          "",
          `**Décision le :** \`${processedAt}\``,
          `**Traité par :** <@${moderator.id}>`,
          "",
          "`REVIEW STATUS : REJECTED`",
          "`DOSSIER : CLOSED`",
        ].join("\n")
      )
    );
}

module.exports = {
  buildContestThreadName,
  buildContestHeaderComponent,
  buildIncomingContestComponent,
  buildOutgoingContestComponent,
  buildContestAcceptedStaffComponent,
  buildContestClosedComponent,
};
