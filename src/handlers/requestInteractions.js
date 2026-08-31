const { MessageFlags } = require("discord.js");
const { getRequest } = require("../catalog");
const { requestLocks, getSubmissionCooldownRemaining } = require("../locks");
const { canProcessRequest } = require("../permissions");
const {
  validateRequestEligibility,
  getMemberBranches,
  getMemberContext,
  applyRequestRoles,
  rollbackRequestRoles,
} = require("../services/roles");
const {
  getRequestChannel,
  getFreshRequestMessage,
} = require("../services/discord");
const { buildRequestModal, buildRejectModal } = require("../ui/modals");
const { buildBranchPanel } = require("../ui/branch");
const { applyRequestNickname } = require("../services/nickname");
const {
  buildStaffRequestComponent,
  buildProcessedComponents,
  getDossierPhase,
} = require("../ui/requests");
const {
  buildAcceptDMComponent,
  buildRejectDMComponent,
} = require("../ui/notifications");
const { contestState, saveContestState } = require("../state");
const { buildContestKey, formatDateTimeFR, getField, safeText } = require("../helpers");

async function openRequestModal(interaction, request) {
  const member = await interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => interaction.member || null);
  if (!member) {
    await interaction.reply({
      content: "❌ Impossible de lire vos rôles Discord.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const eligibility = validateRequestEligibility(member, request);
  if (!eligibility.ok) {
    await interaction.reply({
      content: eligibility.message,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(
    buildRequestModal(request, eligibility.context || getMemberContext(member, request))
  );
}

async function handleRequestInteraction(client, interaction) {
  if (interaction.isButton() && interaction.customId === "branch_open") {
    const member = await interaction.guild.members
      .fetch({ user: interaction.user.id, force: true })
      .catch(() => interaction.member || null);

    if (!member) {
      await interaction.reply({
        content: "❌ Impossible de lire vos rôles Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const branches = getMemberBranches(member);
    if (!branches.length) {
      await interaction.reply({
        content:
          "⛔ Aucune branche active. Obtenez d'abord l'accréditation **Fantassin** ou **Partisan**.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await interaction.reply({
      components: branches.map((branch) => buildBranchPanel(member, branch)).filter(Boolean),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return true;
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("branch_request_select:")
  ) {
    const request = getRequest(interaction.values[0]);
    if (!request) {
      await interaction.reply({
        content: "❌ Type de demande inconnu.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await openRequestModal(interaction, request);
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("request_select:")) {
    const request = getRequest(interaction.values[0]);
    if (!request) {
      await interaction.reply({
        content: "❌ Type de demande inconnu.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await openRequestModal(interaction, request);
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith("request_manual:")) {
    const request = getRequest(interaction.customId.split(":")[1]);
    if (!request) return false;
    await openRequestModal(interaction, request);
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith("approve:")) {
    const [, requestKey, userId] = interaction.customId.split(":");
    const request = getRequest(requestKey);
    if (!request) return true;

    if (!canProcessRequest(interaction.member, request)) {
      await interaction.reply({ content: "⛔ Accès refusé.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const requestId = interaction.message.id;
    if (requestLocks.has(requestId)) {
      await interaction.reply({
        content: "⏳ Ce dossier est déjà en cours de traitement.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    requestLocks.add(requestId);
    let roleTransaction = null;
    let decisionCommitted = false;
    try {
      const message = await getFreshRequestMessage(client, requestId);
      if (!message || getDossierPhase(message) !== "pending") {
        await interaction.reply({
          content: "⚠️ Ce dossier a déjà été traité ou n'est plus accessible.",
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "❌ Demandeur introuvable.", flags: MessageFlags.Ephemeral });
        return true;
      }

      roleTransaction = await applyRequestRoles(
        member,
        request,
        `Demande ${request.label} acceptée par ${interaction.user.tag}`
      );

      const processedMessage = await message.edit({
        components: buildProcessedComponents(message, "approve", interaction.user.id),
      });
      decisionCommitted = true;

      const nicknameResult = await applyRequestNickname(
        member,
        request,
        processedMessage
      );
      if (!nicknameResult.ok && !nicknameResult.skipped) {
        console.warn(
          `[NICKNAME] ${request.label} / ${member.user.tag} : ${nicknameResult.error}`
        );
      }

      await member
        .send({
          components: [buildAcceptDMComponent(request)],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});

      const nicknameLine =
        nicknameResult?.ok && nicknameResult.nickname
          ? `\n✏️ Pseudo appliqué : **${nicknameResult.nickname}**`
          : nicknameResult && !nicknameResult.skipped
            ? "\n⚠️ Accréditation appliquée, mais le renommage du membre a échoué."
            : "";

      await interaction.reply({
        content: `✅ Demande acceptée et rôles appliqués.${nicknameLine}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    } catch (error) {
      if (roleTransaction && !decisionCommitted) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) await rollbackRequestRoles(member, roleTransaction).catch(() => {});
      }
      throw error;
    } finally {
      requestLocks.delete(requestId);
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith("reject:")) {
    const [, requestKey, userId] = interaction.customId.split(":");
    const request = getRequest(requestKey);
    if (!request) return true;

    if (!canProcessRequest(interaction.member, request)) {
      await interaction.reply({ content: "⛔ Accès refusé.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const message = await getFreshRequestMessage(client, interaction.message.id);
    if (!message || getDossierPhase(message) !== "pending") {
      await interaction.reply({
        content: "⚠️ Ce dossier a déjà été traité.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await interaction.showModal(buildRejectModal(requestKey, userId, interaction.message.id));
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("request_modal:")) {
    const requestKey = interaction.customId.slice("request_modal:".length);
    const request = getRequest(requestKey);
    if (!request) {
      await interaction.reply({ content: "❌ Type de demande inconnu.", flags: MessageFlags.Ephemeral });
      return true;
    }

    const remaining = getSubmissionCooldownRemaining(interaction.user.id, requestKey);
    if (remaining > 0) {
      await interaction.reply({
        content: `⏳ Merci d'attendre ${Math.ceil(remaining / 1000)} seconde(s) avant de renvoyer cette demande.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Impossible de lire vos rôles.", flags: MessageFlags.Ephemeral });
      return true;
    }

    // Revalidation au submit : le rôle du joueur peut avoir changé pendant que la modal était ouverte.
    const eligibility = validateRequestEligibility(member, request);
    if (!eligibility.ok) {
      await interaction.reply({ content: eligibility.message, flags: MessageFlags.Ephemeral });
      return true;
    }

    const requestChannel = await getRequestChannel(client);
    if (!requestChannel?.isTextBased()) {
      await interaction.reply({
        content: "❌ Le canal de traitement est introuvable ou inaccessible.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    await requestChannel.send({
      components: [
        buildStaffRequestComponent(
          interaction,
          request,
          eligibility.context || getMemberContext(member, request)
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {
        roles: request.reviewerRoleId ? [request.reviewerRoleId] : [],
        users: [],
        parse: [],
      },
    });

    await interaction.reply({
      content: "✅ Votre dossier a été transmis au Bureau des Accréditations.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("reject_reason:")) {
    const [, requestKey, userId, messageId] = interaction.customId.split(":");
    const request = getRequest(requestKey);
    if (!request || !canProcessRequest(interaction.member, request)) {
      await interaction.reply({ content: "⛔ Accès refusé.", flags: MessageFlags.Ephemeral });
      return true;
    }

    if (requestLocks.has(messageId)) {
      await interaction.reply({
        content: "⏳ Ce dossier est déjà en cours de traitement.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    requestLocks.add(messageId);
    try {
      const message = await getFreshRequestMessage(client, messageId);
      if (!message) {
        await interaction.reply({ content: "❌ Dossier introuvable.", flags: MessageFlags.Ephemeral });
        return true;
      }
      if (getDossierPhase(message) !== "pending") {
        await interaction.reply({ content: "⚠️ Ce dossier a déjà été traité.", flags: MessageFlags.Ephemeral });
        return true;
      }

      const reason = getField(interaction, "reject_reason");
      const cleanReason = reason === "Non renseigné" ? "" : safeText(reason, 1000);
      const processedDate = new Date();
      const key = buildContestKey(userId, messageId);

      contestState.initialDecisions[key] = {
        rejectedAt: formatDateTimeFR(processedDate),
        moderatorId: interaction.user.id,
        reason: cleanReason || "Aucun motif communiqué.",
      };
      saveContestState();

      await message.edit({
        components: buildProcessedComponents(
          message,
          "reject",
          interaction.user.id,
          cleanReason,
          processedDate
        ),
      });

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member
          .send({
            components: [buildRejectDMComponent(request, cleanReason, userId, messageId)],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
      }

      await interaction.reply({
        content: "✅ Demande refusée et dossier mis à jour.",
        flags: MessageFlags.Ephemeral,
      });
      return true;
    } finally {
      requestLocks.delete(messageId);
    }
  }

  return false;
}

module.exports = { handleRequestInteraction };
