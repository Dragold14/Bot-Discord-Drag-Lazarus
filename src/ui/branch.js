const {
  ContainerBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { COLORS, EMOJI_IDS } = require("../config");
const { getAvailableBranchRequests } = require("../services/roles");
const { text, separator } = require("../helpers");

const BRANCH_UI = {
  phys: {
    name: "DIVISION PHYSIQUE",
    code: "PHYS",
    emojiId: EMOJI_IDS.phys,
    emojiText: `<:PHYSICS:${EMOJI_IDS.phys}>`,
    accentColor: COLORS.PHYS_BLUE,
  },

  ptol: {
    name: "DIVISION PTOLÉMÉE",
    code: "PTOL",
    emojiId: EMOJI_IDS.ptol,
    emojiText: `<:PTOLEMY:${EMOJI_IDS.ptol}>`,
    accentColor: COLORS.PTOLEMEE_GREEN,
  },
};

function optionForRequest(request) {
  const isRank =
    request.category === "rank";

  const emojiId =
    request.branch === "phys"
      ? EMOJI_IDS.phys
      : EMOJI_IDS.ptol;

  return {
    label: isRank
      ? `Promotion → ${request.label}`
      : request.label,

    value: request.key,

    description: isRank
      ? "ÉVOLUTION DE GRADE"
      : `SPÉCIALISATION ${
          request.branch === "phys"
            ? "PHYSIQUE"
            : "PTOLÉMÉE"
        }`,

    emoji: {
      id: emojiId,
    },
  };
}

function buildBranchPanel(member, branch) {
  const ui = BRANCH_UI[branch];
  if (!ui) return null;

  const requests = getAvailableBranchRequests(member, branch);
  const rankCount = requests.filter((item) => item.category === "rank").length;
  const specCount = requests.filter(
    (item) => item.category === "specialization"
  ).length;

  const container = new ContainerBuilder()
    .setAccentColor(ui.accentColor)
    .addTextDisplayComponents(
      text(
        [
          `### ${ui.emojiText} // PARCOURS — ${ui.name}`,
          `\`BRANCHE : ${ui.code}\``,
          "",
          `**Promotion disponible :** ${rankCount ? "oui" : "aucune"}`,
          `**Spécialisations disponibles :** ${specCount}`,
        ].join("\n")
      )
    );

  if (!requests.length) {
    return container
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(
        text(
          "✅ Vous ne disposez actuellement d'aucune nouvelle demande de branche éligible."
        )
      );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`branch_request_select:${branch}`)
    .setPlaceholder(`Sélectionner une demande ${ui.code}…`)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(requests.map(optionForRequest));

  return container
    .addSeparatorComponents(separator())
    .addActionRowComponents(new ActionRowBuilder().addComponents(select))
    .addTextDisplayComponents(
      text(
        "-# Le prochain grade est calculé automatiquement. Les spécialisations déjà possédées sont masquées."
      )
    );
}

module.exports = { buildBranchPanel };
