const {
  ContainerBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  COLORS,
  EMOJI_IDS,
} = require("../config");

const {
  GROUPS,
  getGroupRequests,
} = require("../catalog");

const {
  text,
  separator,
} = require("../helpers");

// ============================================================
// MENUS
// ============================================================

function buildSelect(groupKey) {
  const group = GROUPS[groupKey];
  const requests =
    getGroupRequests(groupKey);

  if (
    !group ||
    requests.length === 0
  ) {
    return null;
  }

  return new StringSelectMenuBuilder()
    .setCustomId(
      `request_select:${groupKey}`
    )
    .setPlaceholder(
      group.placeholder
    )
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      requests.map((item) => ({
        label:
          item.label,

        value:
          item.key,

        description:
          item.code.slice(
            0,
            100
          ),

        emoji:
          item.emoji,
      }))
    );
}

// ============================================================
// BLOC PRINCIPAL
// ============================================================

function buildMainBlock() {
  const majorSelect =
    buildSelect("major");

  const container =
    new ContainerBuilder()

      .setAccentColor(
        COLORS.CMO_BLUE
      )

      // ======================================================
      // EN-TÊTE
      // ======================================================

      .addTextDisplayComponents(
        text(
          [
            `# <:CMOBlanc:${EMOJI_IDS.cmoWhite}> COALITION MONDIALE OCCULTE <:CMOBlanc:${EMOJI_IDS.cmoWhite}>`,

            "### BUREAU DES ACCRÉDITATIONS",

            "",

            "`CANAL : ACCREDITATION-NET`",
            "`CLASSIFICATION : INTERNE`",
            "`ACCÈS : PERSONNEL AUTORISÉ`",

            "",

            "> Sélectionnez une accréditation majeure pour intégrer une branche.",

            "> Votre parcours de grade et de spécialisation est ensuite généré automatiquement selon vos rôles Discord.",
          ].join("\n")
        )
      )

      // ======================================================
      // ACCRÉDITATIONS MAJEURES
      // ======================================================

      .addSeparatorComponents(
        separator()
      )

      .addTextDisplayComponents(
        text(
          [
            `### <:CMOBlanc:${EMOJI_IDS.cmoWhite}> ╱╱ ACCRÉDITATIONS MAJEURES ╲╲ <:CMOBlanc:${EMOJI_IDS.cmoWhite}>`,

            "Choisissez votre branche opérationnelle principale.",

            "Une fois validée, elle déverrouille votre parcours de branche.",
          ].join("\n")
        )
      );

  if (majorSelect) {
    container
      .addActionRowComponents(
        new ActionRowBuilder()
          .addComponents(
            majorSelect
          )
      );
  }

  // ==========================================================
  // PARCOURS DE BRANCHE
  // ==========================================================

  container

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          `### <:RessourcesHumaines:${EMOJI_IDS.rh}> ╱╱ PARCOURS DE BRANCHE ╲╲ <:RessourcesHumaines:${EMOJI_IDS.rh}>`,

          "Le terminal détecte automatiquement votre branche active.",

          "",

          "- **PHYS** : prochain grade disponible + spécialisations Physique",

          "- **PTOL** : prochain grade disponible + spécialisations Ptolémée",

          "",

          "-# Le menu généré est privé et dépend de vos rôles actuels.",
        ].join("\n")
      )
    )

    .addActionRowComponents(
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()

            .setCustomId(
              "branch_open"
            )

            .setLabel(
              "OUVRIR MON PARCOURS"
            )

            .setEmoji({
              id:
                EMOJI_IDS.rh,
            })

            .setStyle(
              ButtonStyle.Primary
            )
        )
    );

  return container;
}

// ============================================================
// BLOC SECONDAIRE
// ============================================================

function buildSecondaryBlock() {
  const otherSelect =
    buildSelect("other");

  const container =
    new ContainerBuilder()

      .setAccentColor(
        COLORS.OTHER_YELLOW
      )

      // ======================================================
      // AUTRES ACCRÉDITATIONS
      // ======================================================

      .addTextDisplayComponents(
        text(
          [
            `### <:logo_workshop_upscale:${EMOJI_IDS.other}> ╱╱ AUTRES ACCRÉDITATIONS ╲╲ <:logo_workshop_upscale:${EMOJI_IDS.other}>`,

            "Demandes hors parcours PHYS / PTOL.",

            "",

            "**Disponibles :** R&D, Haut Commandement, rôle Staff et demande particulière.",
          ].join("\n")
        )
      );

  if (otherSelect) {
    container
      .addActionRowComponents(
        new ActionRowBuilder()
          .addComponents(
            otherSelect
          )
      );
  }

  // ==========================================================
  // FOOTER
  // ==========================================================

  container

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          `<:CMO_Transparent:${EMOJI_IDS.cmoTransparent}> \`ACCREDITATION TERMINAL // ONLINE\` <:CMO_Transparent:${EMOJI_IDS.cmoTransparent}>`,

          "-# Toute fausse déclaration peut entraîner le retrait de vos accréditations.",
        ].join("\n")
      )
    );

  return container;
}

// ============================================================
// PANNEAU COMPLET
// ============================================================

function buildAccreditationPanel() {
  return [
    buildMainBlock(),
    buildSecondaryBlock(),
  ];
}

module.exports = {
  buildAccreditationPanel,
};