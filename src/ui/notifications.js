const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { COLORS } = require("../config");
const { text, separator, safeText } = require("../helpers");

function buildSystemNotice(title, lines, accentColor = COLORS.OTHER_YELLOW) {
  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      text(
        [
          `### ${title}`,
          "",
          ...(Array.isArray(lines) ? lines : [lines]),
        ].join("\n")
      )
    );
}

function buildAcceptDMComponent(request) {
  return new ContainerBuilder()
    .setAccentColor(request.accentColor)
    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",
          "### NOTIFICATION DE DOSSIER",
          "",
          "🟢 **DEMANDE ACCEPTÉE**",
          "",
          `Votre demande **${request.label}** a été validée.`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(
      text(
        [
          request.grantRoleIds.length
            ? "Les rôles Discord associés à cette accréditation ont été appliqués."
            : "Votre demande particulière a été validée.",
          "",
          "`STATUS : ACCEPTED`",
        ].join("\n")
      )
    );
}

function buildRejectDMComponent(request, reason, userId, requestId) {
  const cleanReason = reason?.trim() ? safeText(reason.trim(), 1000) : "";
  const container = new ContainerBuilder()
    .setAccentColor(request.accentColor)
    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",
          "### NOTIFICATION DE DOSSIER",
          "",
          "🔴 **DEMANDE REFUSÉE**",
          "",
          `Votre demande **${request.label}** n'a pas été validée.`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(
      text(
        cleanReason
          ? [
              "### // MOTIF DU REFUS",
              "",
              `> ${cleanReason.replace(/\n/g, "\n> ")}`,
            ].join("\n")
          : "Aucun motif n'a été communiqué."
      )
    )
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(
      text(
        "Si vous souhaitez demander le réexamen de cette décision, utilisez le bouton ci-dessous."
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`contest_open:${request.key}:${userId}:${requestId}`)
          .setLabel("CONTESTER CETTE DÉCISION")
          .setEmoji("📨")
          .setStyle(ButtonStyle.Primary)
      )
    );

  return container;
}

function buildNoActiveContestDM() {
  return buildSystemNotice(
    "⚠️ AUCUNE CONTESTATION ACTIVE",
    "Utilisez le bouton **Contester cette décision** présent dans la notification de refus concernée."
  );
}

function buildContestOpenedDM(request) {
  return buildSystemNotice("🟠 RÉEXAMEN OUVERT", [
    `Dossier : **${request.label}**`,
    "",
    "Vous pouvez maintenant écrire directement ici. Vos messages seront transmis au Bureau.",
  ]);
}

function buildContestAlreadyClosedDM() {
  return buildSystemNotice("🔒 RÉEXAMEN DÉJÀ CLÔTURÉ", [
    "Cette décision a déjà fait l'objet d'un réexamen.",
    "",
    "Aucune nouvelle contestation ne peut être ouverte depuis cette notification.",
  ]);
}

function buildContestAcceptedDM(request) {
  return buildSystemNotice(
    "✅ RÉEXAMEN ACCEPTÉ",
    [
      `Votre demande concernant **${request.label}** a été réexaminée.`,
      "",
      "**La décision initiale a été révisée et votre demande est désormais acceptée.**",
      "",
      request.grantRoleIds.length
        ? "Les rôles Discord associés ont été appliqués."
        : "Votre demande particulière a été validée.",
    ],
    COLORS.SUCCESS
  );
}

function buildContestRejectedDM(request) {
  return buildSystemNotice(
    "❌ RÉEXAMEN TERMINÉ",
    [
      `Votre demande de réexamen concernant **${request.label}** n'a pas été retenue.`,
      "",
      "La décision initiale reste inchangée.",
    ],
    COLORS.STAFF_RED
  );
}

module.exports = {
  buildSystemNotice,
  buildAcceptDMComponent,
  buildRejectDMComponent,
  buildNoActiveContestDM,
  buildContestOpenedDM,
  buildContestAlreadyClosedDM,
  buildContestAcceptedDM,
  buildContestRejectedDM,
};
