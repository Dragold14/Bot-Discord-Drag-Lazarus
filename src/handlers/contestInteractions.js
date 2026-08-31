const { MessageFlags } = require("discord.js");
const { getRequest } = require("../catalog");
const { contestState, saveContestState } = require("../state");
const { contestLocks } = require("../locks");
const { canProcessRequest, canUseBureauMessaging } = require("../permissions");
const { buildContestKey, formatDateTimeFR, getField, safeText, quoteMessage } = require("../helpers");
const {
  getFreshRequestMessage,
  fetchRecordedThread,
} = require("../services/discord");
const {
  getInitialDecision,
  resetStaleClosedContest,
  getOrCreateContestThread,
} = require("../services/contests");
const { applyRequestRoles, rollbackRequestRoles } = require("../services/roles");
const { applyRequestNickname } = require("../services/nickname");
const { buildContestReplyModal } = require("../ui/modals");
const {
  getDossierPhase,
  buildContestOpenedDossierComponents,
  buildContestClosedDossierComponents,
  buildAppealAcceptedComponents,
} = require("../ui/requests");
const {
  buildSystemNotice,
  buildContestOpenedDM,
  buildContestAlreadyClosedDM,
  buildContestAcceptedDM,
  buildContestRejectedDM,
} = require("../ui/notifications");
const {
  buildOutgoingContestComponent,
  buildContestAcceptedStaffComponent,
  buildContestClosedComponent,
} = require("../ui/contests");
const { COLORS } = require("../config");

async function handleContestOpen(client, interaction) {
  const [, requestKey, userId, requestId] = interaction.customId.split(":");
  const request = getRequest(requestKey);

  if (interaction.user.id !== userId) {
    await interaction.reply({
      components: [
        buildSystemNotice(
          "⛔ ACCÈS REFUSÉ",
          "Cette décision ne vous appartient pas.",
          COLORS.STAFF_RED
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (!request) {
    await interaction.reply({
      components: [buildSystemNotice("⚠️ DOSSIER INCONNU", "Le dossier lié à cette notification est introuvable.")],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const originalMessage = await getFreshRequestMessage(client, requestId);
  if (!originalMessage) {
    await interaction.reply({
      components: [buildSystemNotice("⚠️ DOSSIER INTROUVABLE", "Le dossier source n'existe plus ou n'est plus accessible.")],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const phase = getDossierPhase(originalMessage);
  const initialDecision = getInitialDecision(userId, requestId, originalMessage);

  if (phase === "accepted" || phase === "review_accepted" || phase === "review_rejected") {
    await interaction.reply({
      components: [
        buildSystemNotice(
          "🔒 RÉEXAMEN INDISPONIBLE",
          "Cette décision ne peut plus être contestée depuis cette notification."
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (phase === "pending") {
    await interaction.reply({
      components: [buildSystemNotice("⚠️ DOSSIER EN ATTENTE", "Le dossier n'a pas encore reçu de décision initiale.")],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  // Le dossier Discord fait foi. Si Discord indique toujours un refus initial,
  // un ancien record fermé dans le JSON est nécessairement obsolète.
  if (phase === "rejected") resetStaleClosedContest(userId, requestId);

  const contestable =
    phase === "rejected" ||
    phase === "review_pending" ||
    (phase === "unknown" && Boolean(initialDecision));

  if (!contestable) {
    await interaction.reply({
      components: [
        buildSystemNotice(
          "🔒 RÉEXAMEN INDISPONIBLE",
          "Cette décision ne peut plus être contestée depuis cette notification."
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  const result = await getOrCreateContestThread({
    client,
    user: interaction.user,
    request,
    requestId,
  });

  if (result.conflict) {
    await interaction.reply({
      components: [
        buildSystemNotice("⚠️ RÉEXAMEN DÉJÀ ACTIF", [
          "Vous avez déjà une autre contestation ouverte.",
          "",
          "Terminez-la avant d'en ouvrir une nouvelle afin d'éviter de mélanger les échanges.",
        ]),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (result.busy) {
    await interaction.reply({
      components: [buildSystemNotice("⏳ OUVERTURE EN COURS", "Le réexamen est déjà en cours d'ouverture. Réessayez dans quelques secondes.")],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (result.closed) {
    await interaction.reply({
      components: [buildContestAlreadyClosedDM()],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (result.thread && (result.created || phase === "rejected")) {
    await originalMessage.edit({
      components: buildContestOpenedDossierComponents(
        originalMessage,
        result.thread.id,
        initialDecision || {
          rejectedAt: "Date inconnue",
          moderatorId: null,
          reason: "Aucun motif communiqué.",
        }
      ),
    });
  }

  await interaction.reply({
    components: [buildContestOpenedDM(request)],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleContestDecision(client, interaction, accepted) {
  const [, userId, requestId] = interaction.customId.split(":");
  const key = buildContestKey(userId, requestId);

  if (contestLocks.has(key)) {
    await interaction.reply({
      content: "⏳ Une décision est déjà en cours sur ce réexamen.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const record = contestState.records[key];
  if (!record || record.status !== "open") {
    await interaction.reply({
      content: "❌ Ce réexamen n'est plus ouvert.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const request = getRequest(record.type);
  if (!request || !canProcessRequest(interaction.member, request)) {
    await interaction.reply({ content: "⛔ Accès refusé.", flags: MessageFlags.Ephemeral });
    return;
  }

  contestLocks.add(key);
  let roleTransaction = null;
  let decisionCommitted = false;
  try {
    await interaction.deferUpdate();

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const originalMessage = await getFreshRequestMessage(client, requestId);
    if (!originalMessage) throw new Error("Dossier source introuvable.");

    const initialDecision = getInitialDecision(userId, requestId, originalMessage) || {
      rejectedAt: "Date inconnue",
      moderatorId: null,
      reason: "Aucun motif communiqué.",
    };

    if (accepted) {
      if (!member) throw new Error("Demandeur introuvable.");
      roleTransaction = await applyRequestRoles(
        member,
        request,
        `Réexamen ${request.label} accepté par ${interaction.user.tag}`
      );
      const processedMessage = await originalMessage.edit({
        components: buildAppealAcceptedComponents(
          originalMessage,
          interaction.user.id,
          initialDecision
        ),
      });
      decisionCommitted = true;

      const nicknameResult = await applyRequestNickname(
        member,
        request,
        processedMessage
      );
      if (!nicknameResult.ok && !nicknameResult.skipped) {
        console.warn(
          `[NICKNAME] Réexamen ${request.label} / ${member.user.tag} : ${nicknameResult.error}`
        );
      }

      record.status = "accepted";
    } else {
      await originalMessage.edit({
        components: buildContestClosedDossierComponents(
          originalMessage,
          interaction.user.id,
          initialDecision
        ),
      });
      record.status = "rejected";
    }

    record.closedAt = formatDateTimeFR();
    record.closedBy = interaction.user.id;
    if (contestState.activeByUser[userId] === key) {
      delete contestState.activeByUser[userId];
    }
    saveContestState();

    const thread = await fetchRecordedThread(client, record);
    if (thread) {
      await interaction.message
        .edit({
          components: [
            accepted
              ? buildContestAcceptedStaffComponent(interaction.user)
              : buildContestClosedComponent(interaction.user),
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
      await thread.setLocked(true).catch(() => {});
      await thread.setArchived(true).catch(() => {});
    }

    if (member) {
      await member
        .send({
          components: [
            accepted
              ? buildContestAcceptedDM(request)
              : buildContestRejectedDM(request),
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  } catch (error) {
    if (roleTransaction && !decisionCommitted) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) await rollbackRequestRoles(member, roleTransaction).catch(() => {});
    }
    throw error;
  } finally {
    contestLocks.delete(key);
  }
}

async function handleContestInteraction(client, interaction) {
  if (interaction.isButton() && interaction.customId.startsWith("contest_open:")) {
    await handleContestOpen(client, interaction);
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith("contest_reply:")) {
    const [, userId, requestId] = interaction.customId.split(":");
    const key = buildContestKey(userId, requestId);
    const record = contestState.records[key];

    if (contestLocks.has(key)) {
      await interaction.reply({ content: "⏳ Une décision est en cours sur ce réexamen.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const request = getRequest(record?.type);
    if (!record || record.status !== "open" || !request) {
      await interaction.reply({ content: "❌ Ce réexamen n'est plus ouvert.", flags: MessageFlags.Ephemeral });
      return true;
    }

    if (!canProcessRequest(interaction.member, request)) {
      await interaction.reply({ content: "⛔ Accès refusé.", flags: MessageFlags.Ephemeral });
      return true;
    }

    await interaction.showModal(buildContestReplyModal(userId, requestId));
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith("contest_accept:")) {
    await handleContestDecision(client, interaction, true);
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith("contest_close:")) {
    await handleContestDecision(client, interaction, false);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("contest_reply_modal:")) {
    const [, userId, requestId] = interaction.customId.split(":");
    const key = buildContestKey(userId, requestId);
    const record = contestState.records[key];
    const request = getRequest(record?.type);

    if (
      !record ||
      record.status !== "open" ||
      !request ||
      !canUseBureauMessaging(interaction.member) ||
      !canProcessRequest(interaction.member, request)
    ) {
      await interaction.reply({ content: "⛔ Ce réexamen n'est pas accessible.", flags: MessageFlags.Ephemeral });
      return true;
    }

    if (contestLocks.has(key)) {
      await interaction.reply({ content: "⏳ Une décision est en cours sur ce réexamen.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const reply = safeText(getField(interaction, "reply_message"), 1500);
    const user = await client.users.fetch(userId).catch(() => null);
    const thread = await fetchRecordedThread(client, record);

    if (!user || !thread || thread.locked) {
      await interaction.reply({ content: "❌ Impossible de transmettre la réponse.", flags: MessageFlags.Ephemeral });
      return true;
    }

    if (thread.archived) await thread.setArchived(false).catch(() => {});

    // Côté joueur : conversation fluide, pas de carte système.
    await user.send({
      content: quoteMessage(reply),
      allowedMentions: { parse: [] },
    });

    // Côté staff : trace explicite de ce qui a été transmis.
    await thread.send({
      components: [buildOutgoingContestComponent(reply, interaction.user)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    await interaction.reply({
      content: "✅ Réponse transmise au demandeur.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  return false;
}

module.exports = { handleContestInteraction };
