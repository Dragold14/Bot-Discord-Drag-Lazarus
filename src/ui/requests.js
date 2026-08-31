const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { COLORS } = require("../config");
const { getRequestFields } = require("../forms");
const {
  text,
  separator,
  getField,
  formatDateTimeFR,
  mapMessageComponents,
  getMessageComponentText,
  safeText,
} = require("../helpers");

function buildStaffRequestComponent(interaction, request, context = {}) {
  const dossierId = `${request.key.toUpperCase()}-${interaction.user.id.slice(-6)}`;
  const fields = getRequestFields(request, context);

  // ==========================================================
  // INFORMATIONS DU FORMULAIRE
  // ==========================================================

  const values = fields.flatMap((field) => {
    const value = safeText(
      getField(interaction, field.id),
      field.style === "paragraph" ? 1200 : 180
    );

    const rendered =
      field.style === "paragraph"
        ? `> ${value.replace(/\n/g, "\n> ")}`
        : `\`${value}\``;

    return [
      `**${field.label}**`,
      rendered,
      "",
    ];
  });

  // ==========================================================
  // TYPE DE DEMANDE
  // ==========================================================

  const route = String(request.code || "");
  const routeUpper = route.toUpperCase();

  let requestType = "Demande d'accréditation";

  if (routeUpper.startsWith("RANK")) {
    requestType = "Promotion de grade";
  } else if (
    routeUpper.startsWith("SPEC") ||
    routeUpper.includes("SPECIAL")
  ) {
    requestType = "Demande de spécialisation";
  } else if (routeUpper.includes("STAFF")) {
    requestType = "Accréditation Staff";
  } else if (
    routeUpper.includes("HIGH") ||
    routeUpper.includes("HC")
  ) {
    requestType = "Accréditation Haut Commandement";
  } else if (
    routeUpper.includes("R&D") ||
    routeUpper.includes("RD")
  ) {
    requestType = "Accréditation R&D";
  }

  // ==========================================================
  // BRANCHE
  // ==========================================================

  let branchLabel = "";

  if (request.branch === "phys") {
    branchLabel = "PHYSIQUE";
  } else if (request.branch === "ptol") {
    branchLabel = "PTOLÉMÉE";
  }

  const requestDescription = branchLabel
    ? `${requestType} • Branche **${branchLabel}**`
    : requestType;

  // ==========================================================
  // CONTEXTE AUTOMATIQUE
  // ==========================================================

  const contextLines = [];

  if (request.branch) {
    contextLines.push(
      `**Branche ciblée :** ${
        request.branch === "phys"
          ? "PHYSIQUE"
          : "PTOLÉMÉE"
      }`
    );
  }

  if (context.currentRankLabel) {
    contextLines.push(
      `**Grade actuellement détecté :** ${context.currentRankLabel}`
    );
  }

  // ==========================================================
  // CONSTRUCTION DU DOSSIER STAFF
  // ==========================================================

  const container = new ContainerBuilder()
    .setAccentColor(request.accentColor)

    // ========================================================
    // DEMANDE
    // ========================================================

    .addTextDisplayComponents(
      text(
        [
          "### 🎯 // ACCRÉDITATION DEMANDÉE",
          `## ${request.label.toUpperCase()}`,
          `> ${requestDescription}`,
          "",
          `**Demandeur :** <@${interaction.user.id}>`,
          `**Dossier :** \`${dossierId}\``,
          "",
          `-# Route technique : ${request.code}`,
        ].join("\n")
      )
    )

    // ========================================================
    // ÉTAT
    // ========================================================

    .addSeparatorComponents(separator())

    .addTextDisplayComponents(
      text(
        [
          "### // ÉTAT DU DOSSIER",
          "🟡 **EN ATTENTE D'EXAMEN**",
          "",
          "`STATUS : PENDING REVIEW`",
        ].join("\n")
      )
    );

  // ==========================================================
  // CONTEXTE AUTOMATIQUE
  // ==========================================================

  if (contextLines.length) {
    container
      .addSeparatorComponents(separator())

      .addTextDisplayComponents(
        text(
          [
            "### // CONTEXTE AUTOMATIQUE",
            "",
            ...contextLines,
          ].join("\n")
        )
      );
  }

  // ==========================================================
  // INFORMATIONS TRANSMISES
  // ==========================================================

  container
    .addSeparatorComponents(separator())

    .addTextDisplayComponents(
      text(
        [
          "### // INFORMATIONS TRANSMISES",
          "",
          ...values,
        ]
          .join("\n")
          .trim()
      )
    )

    // ========================================================
    // VALIDATION
    // ========================================================

    .addSeparatorComponents(separator())

    .addTextDisplayComponents(
      text(
        [
          "### // VALIDATION",
          "Ce dossier est en attente d'une décision du personnel habilité.",
        ].join("\n")
      )
    )

    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `approve:${request.key}:${interaction.user.id}`
          )
          .setLabel("ACCEPTER")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(
            `reject:${request.key}:${interaction.user.id}`
          )
          .setLabel("REFUSER")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      )
    )

    // ========================================================
    // FOOTER
    // ========================================================

    .addSeparatorComponents(separator())

    .addTextDisplayComponents(
      text(
        [
          request.reviewerRoleId
            ? `**Personnel habilité :** <@&${request.reviewerRoleId}>`
            : "**Personnel habilité :** Administrateurs",
          "",
          "`CLASSIFICATION : INTERNE`",
          "`BUREAU DES ACCRÉDITATIONS // ARCHIVES`",
        ].join("\n")
      )
    );

  return container;
}

function buildProcessedComponents(
  message,
  action,
  moderatorId,
  rejectReason = "",
  processedDate = new Date()
) {
  const accepted = action === "approve";
  const processedAt = formatDateTimeFR(processedDate);
  const cleanReason = rejectReason?.trim()
    ? safeText(rejectReason.trim(), 1000)
    : "Aucun motif communiqué.";

  return mapMessageComponents(message, (component) => {
    if (typeof component.content === "string") {
      if (
        component.content.includes("### // ÉTAT DU DOSSIER") ||
        component.content.includes("### // DEMANDE INITIALE")
      ) {
        component.content = accepted
          ? [
              "### // DEMANDE INITIALE",
              "🟢 **DEMANDE ACCEPTÉE**",
              "",
              "`STATUS : ACCEPTED`",
              "",
              `**Validé le :** \`${processedAt}\``,
              `**Traité par :** <@${moderatorId}>`,
            ].join("\n")
          : [
              "### // DEMANDE INITIALE",
              "🔴 **DEMANDE REFUSÉE**",
              "",
              "`STATUS : REJECTED`",
              "",
              `**Rejeté le :** \`${processedAt}\``,
              `**Traité par :** <@${moderatorId}>`,
              `**Motif :** ${cleanReason}`,
            ].join("\n");
      }

      if (component.content.includes("### // VALIDATION")) {
        component.content = [
          "### // VALIDATION",
          accepted ? "Le dossier a été validé." : "La demande initiale a été refusée.",
        ].join("\n");
      }
    }

    if (
      component.custom_id?.startsWith("approve:") ||
      component.custom_id?.startsWith("reject:")
    ) {
      component.disabled = true;
      if (accepted && component.custom_id.startsWith("approve:")) {
        component.label = "DEMANDE ACCEPTÉE";
        component.style = ButtonStyle.Success;
      }
      if (!accepted && component.custom_id.startsWith("reject:")) {
        component.label = "DEMANDE REFUSÉE";
        component.style = ButtonStyle.Danger;
      }
    }
  });
}

function getDossierPhase(message) {
  const content = getMessageComponentText(message);

  if (content.includes("### // RÉEXAMEN") && content.includes("`STATUS : UNDER REVIEW`")) {
    return "review_pending";
  }
  if (content.includes("### // RÉEXAMEN") && content.includes("`STATUS : ACCEPTED`")) {
    return "review_accepted";
  }
  if (content.includes("### // RÉEXAMEN") && content.includes("`STATUS : REJECTED`")) {
    return "review_rejected";
  }
  if (content.includes("`STATUS : PENDING REVIEW`")) return "pending";
  if (content.includes("### // DEMANDE INITIALE") && content.includes("`STATUS : REJECTED`")) {
    return "rejected";
  }
  if (content.includes("### // DEMANDE INITIALE") && content.includes("`STATUS : ACCEPTED`")) {
    return "accepted";
  }
  return "unknown";
}

function inferInitialDecisionFromMessage(message) {
  const content = getMessageComponentText(message);
  if (!content.includes("DEMANDE REFUSÉE")) return null;

  const rejectedAt = content.match(/\*\*Rejeté le :\*\* `([^`]+)`/)?.[1] || "";
  const moderatorId = content.match(/\*\*Traité par :\*\* <@!?(\d+)>/)?.[1] || "";
  const reason = content.match(/\*\*Motif :\*\* ([^\n]+)/)?.[1]?.trim() || "";

  if (!rejectedAt && !moderatorId && !reason) return null;
  return {
    rejectedAt: rejectedAt || "Date inconnue",
    moderatorId: moderatorId || null,
    reason: reason || "Aucun motif communiqué.",
  };
}

function buildInitialDecisionHistory(decision) {
  return [
    "### // DÉCISION INITIALE",
    "🔴 **DEMANDE REFUSÉE**",
    "",
    `**Rejeté le :** \`${decision?.rejectedAt || "Date inconnue"}\``,
    `**Traité par :** ${decision?.moderatorId ? `<@${decision.moderatorId}>` : "Inconnu"}`,
    `**Motif :** ${decision?.reason || "Aucun motif communiqué."}`,
  ].join("\n");
}

function extractReviewContext(content) {
  const openedAt = content.match(/\*\*Ouvert le :\*\* `([^`]+)`/)?.[1] || "";
  const threadId = content.match(/\*\*Fil :\*\* <#(\d+)>/)?.[1] || "";
  return {
    openedLine: openedAt ? `**Ouvert le :** \`${openedAt}\`` : "",
    threadLine: threadId ? `**Fil :** <#${threadId}>` : "",
  };
}

function buildContestOpenedDossierComponents(message, threadId, initialDecision) {
  const openedAt = formatDateTimeFR();
  return mapMessageComponents(message, (component) => {
    if (typeof component.content !== "string") return;

    if (
      component.content.includes("### // DEMANDE INITIALE") ||
      component.content.includes("### // ÉTAT DU DOSSIER") ||
      component.content.includes("### // RÉEXAMEN")
    ) {
      component.content = [
        "### // RÉEXAMEN",
        "🟠 **RÉEXAMEN EN COURS**",
        "",
        "`STATUS : UNDER REVIEW`",
        "",
        `**Ouvert le :** \`${openedAt}\``,
        `**Fil :** <#${threadId}>`,
        "",
        buildInitialDecisionHistory(initialDecision),
      ].join("\n");
    }

    if (component.content.includes("### // VALIDATION")) {
      component.content = [
        "### // VALIDATION",
        "Le dossier fait actuellement l'objet d'un réexamen.",
      ].join("\n");
    }
  });
}

function buildContestClosedDossierComponents(message, moderatorId, initialDecision) {
  const decisionAt = formatDateTimeFR();
  return mapMessageComponents(message, (component) => {
    if (typeof component.content === "string") {
      if (component.content.includes("### // RÉEXAMEN")) {
        const { openedLine, threadLine } = extractReviewContext(component.content);
        component.content = [
          "### // RÉEXAMEN",
          "🔴 **RÉEXAMEN REFUSÉ**",
          "",
          "`STATUS : REJECTED`",
          "",
          openedLine,
          `**Décision le :** \`${decisionAt}\``,
          `**Traité par :** <@${moderatorId}>`,
          threadLine,
          "",
          buildInitialDecisionHistory(initialDecision),
        ]
          .filter((line, index, array) => line !== "" || array[index - 1] !== "")
          .join("\n");
      }
      if (component.content.includes("### // VALIDATION")) {
        component.content = [
          "### // VALIDATION",
          "Réexamen terminé. La décision initiale est maintenue.",
        ].join("\n");
      }
    }

    if (component.custom_id?.startsWith("approve:")) {
      component.disabled = true;
      component.label = "DOSSIER REFUSÉ";
      component.style = ButtonStyle.Secondary;
    }
    if (component.custom_id?.startsWith("reject:")) {
      component.disabled = true;
      component.label = "RÉEXAMEN REFUSÉ";
      component.style = ButtonStyle.Danger;
      component.emoji = { name: "❌" };
    }
  });
}

function buildAppealAcceptedComponents(message, moderatorId, initialDecision) {
  const decisionAt = formatDateTimeFR();
  return mapMessageComponents(message, (component) => {
    if (typeof component.content === "string") {
      if (component.content.includes("### // RÉEXAMEN")) {
        const { openedLine, threadLine } = extractReviewContext(component.content);
        component.content = [
          "### // RÉEXAMEN",
          "🟢 **RÉEXAMEN ACCEPTÉ**",
          "",
          "`STATUS : ACCEPTED`",
          "",
          openedLine,
          `**Décision le :** \`${decisionAt}\``,
          `**Validé par :** <@${moderatorId}>`,
          threadLine,
          "",
          buildInitialDecisionHistory(initialDecision),
        ]
          .filter((line, index, array) => line !== "" || array[index - 1] !== "")
          .join("\n");
      }
      if (component.content.includes("### // VALIDATION")) {
        component.content = [
          "### // VALIDATION",
          "Réexamen terminé. Le dossier est désormais validé.",
        ].join("\n");
      }
    }

    if (component.custom_id?.startsWith("approve:") || component.custom_id?.startsWith("reject:")) {
      component.disabled = true;
      component.label = component.custom_id.startsWith("approve:")
        ? "DOSSIER VALIDÉ"
        : "RÉEXAMEN ACCEPTÉ";
      component.style = ButtonStyle.Success;
      component.emoji = { name: "✅" };
    }
  });
}

module.exports = {
  buildStaffRequestComponent,
  buildProcessedComponents,
  getDossierPhase,
  inferInitialDecisionFromMessage,
  buildContestOpenedDossierComponents,
  buildContestClosedDossierComponents,
  buildAppealAcceptedComponents,
};
