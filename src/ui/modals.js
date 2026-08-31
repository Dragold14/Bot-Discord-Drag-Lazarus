const { ModalBuilder } = require("discord.js");
const { makeInput } = require("../helpers");
const { getRequestFields } = require("../forms");

function buildRequestModal(request, context = {}) {
  const modal = new ModalBuilder()
    .setCustomId(`request_modal:${request.key}`)
    .setTitle(`CMO // ${request.label}`.slice(0, 45));

  modal.addComponents(
    ...getRequestFields(request, context).map((field) => makeInput(field))
  );
  return modal;
}

function buildRejectModal(requestKey, userId, messageId) {
  return new ModalBuilder()
    .setCustomId(`reject_reason:${requestKey}:${userId}:${messageId}`)
    .setTitle("CMO // Refus du dossier")
    .addComponents(
      makeInput({
        id: "reject_reason",
        label: "Motif du refus (facultatif)",
        placeholder: "Indiquez le motif communiqué au demandeur...",
        required: false,
        style: "paragraph",
        maxLength: 1000,
      })
    );
}

function buildContestReplyModal(userId, requestId) {
  return new ModalBuilder()
    .setCustomId(`contest_reply_modal:${userId}:${requestId}`)
    .setTitle("CMO // Réponse du Bureau")
    .addComponents(
      makeInput({
        id: "reply_message",
        label: "Réponse au demandeur",
        placeholder: "Rédigez la réponse du Bureau...",
        style: "paragraph",
        maxLength: 1500,
      })
    );
}

module.exports = {
  buildRequestModal,
  buildRejectModal,
  buildContestReplyModal,
};
