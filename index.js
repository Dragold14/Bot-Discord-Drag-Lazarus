require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

// ============================================================
// CONFIGURATION
// ============================================================

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  REQUEST_CHANNEL_ID,
  STAFF_ROLE_ID,
  HC_STAFF_ROLE_ID,
  ROLE_PHYSIQUE_ID,
  ROLE_PTOLEMEE_ID,
  ROLE_RD_ID,
  ROLE_HC_ID,
} = process.env;

const requiredVariables = [
  "DISCORD_TOKEN",
  "CLIENT_ID",
  "GUILD_ID",
  "REQUEST_CHANNEL_ID",
  "STAFF_ROLE_ID",
  "ROLE_PHYSIQUE_ID",
  "ROLE_PTOLEMEE_ID",
  "ROLE_RD_ID",
  "ROLE_HC_ID",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    console.error(`[CONFIG] Variable manquante : ${variable}`);
    process.exit(1);
  }
}

// ============================================================
// NOMBRE DE JOUEURS
// ============================================================

const { GameDig } = require("gamedig");

// ============================================================
// CLIENT DISCORD
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ============================================================
// IDENTITÉ VISUELLE CMO
// ============================================================

const COLORS = {
  CMO_BLUE: 0x1677d2,
  PTOLEMEE_GREEN: 0x3ba55d,
  RD_DARK_GREEN: 0x195c3a,
  STAFF_RED: 0xd32f2f,
  OTHER_YELLOW: 0xf0b232,
  SUCCESS: 0x2ea043,
};

const REQUEST_TYPES = {
  physique: {
    label: "Fantassin Physique",
    code: "PHYSIQUE",
    roleId: ROLE_PHYSIQUE_ID,
    accentColor: COLORS.CMO_BLUE,
  },

  ptolemee: {
    label: "Opérateur Ptolémée",
    code: "PTOLÉMÉE",
    roleId: ROLE_PTOLEMEE_ID,
    accentColor: COLORS.PTOLEMEE_GREEN,
  },

  rd: {
    label: "Membre R&D",
    code: "R&D",
    roleId: ROLE_RD_ID,
    accentColor: COLORS.RD_DARK_GREEN,
  },

  hc: {
    label: "Membre Haut Commandement",
    code: "HAUT COMMANDEMENT",
    roleId: ROLE_HC_ID,
    accentColor: COLORS.STAFF_RED,
  },

  autre: {
    label: "Demande particulière",
    code: "AUTRE",
    roleId: null,
    accentColor: COLORS.OTHER_YELLOW,
  },
};

// ============================================================
// SAUVEGARDE DES CONTESTATIONS
// ============================================================

const STATE_FILE = path.join(
  __dirname,
  "contestations.json"
);

const STATE_BACKUP_FILE = path.join(
  __dirname,
  "contestations.backup.json"
);

let contestState = {
  records: {},
  activeByUser: {},
  initialDecisions: {},
};

function normalizeContestState(
  parsed = {}
) {
  return {
    records:
      parsed.records &&
      typeof parsed.records ===
        "object"
        ? parsed.records
        : {},

    activeByUser:
      parsed.activeByUser &&
      typeof parsed.activeByUser ===
        "object"
        ? parsed.activeByUser
        : {},

    initialDecisions:
      parsed.initialDecisions &&
      typeof parsed.initialDecisions ===
        "object"
        ? parsed.initialDecisions
        : {},
  };
}

function loadContestState() {
  const candidates = [
    STATE_FILE,
    STATE_BACKUP_FILE,
  ];

  for (
    const file of candidates
  ) {
    try {
      if (
        !fs.existsSync(file)
      ) {
        continue;
      }

      const parsed =
        JSON.parse(
          fs.readFileSync(
            file,
            "utf8"
          )
        );

      contestState =
        normalizeContestState(
          parsed
        );

      console.log(
        file === STATE_FILE
          ? "[CONTESTATIONS] État chargé."
          : "[CONTESTATIONS] Sauvegarde de secours chargée."
      );

      if (
        file ===
        STATE_BACKUP_FILE
      ) {
        try {
          fs.copyFileSync(
            STATE_BACKUP_FILE,
            STATE_FILE
          );
        } catch (
          restoreError
        ) {
          console.error(
            "[CONTESTATIONS] Restauration du fichier principal impossible :",
            restoreError
          );
        }
      }

      return;
    } catch (error) {
      console.error(
        `[CONTESTATIONS] Lecture impossible (${path.basename(
          file
        )}) :`,
        error
      );
    }
  }
}

function saveContestState() {
  try {
    if (
      fs.existsSync(
        STATE_FILE
      )
    ) {
      fs.copyFileSync(
        STATE_FILE,
        STATE_BACKUP_FILE
      );
    }

    fs.writeFileSync(
      STATE_FILE,

      JSON.stringify(
        contestState,
        null,
        2
      ),

      "utf8"
    );
  } catch (error) {
    console.error(
      "[CONTESTATIONS] Sauvegarde impossible :",
      error
    );

    throw error;
  }
}

loadContestState();

// ============================================================
// COMMANDE /accreditations
// ============================================================

const commands = [
  new SlashCommandBuilder()

    .setName(
      "accreditations"
    )

    .setDescription(
      "Publie le terminal du Bureau des Accréditations."
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),
].map(
  (command) =>
    command.toJSON()
);

async function registerCommands() {
  const rest =
    new REST({
      version: "10",
    }).setToken(
      DISCORD_TOKEN
    );

  await rest.put(
    Routes.applicationGuildCommands(
      CLIENT_ID,
      GUILD_ID
    ),
    {
      body: commands,
    }
  );

  console.log(
    "Commande /accreditations enregistrée."
  );
}

// ============================================================
// HELPERS
// ============================================================

function text(content) {
  return new TextDisplayBuilder()
    .setContent(content);
}

function separator() {
  return new SeparatorBuilder();
}

function safeText(
  value,
  maxLength = 1800
) {
  if (!value) {
    return "Non renseigné";
  }

  const cleaned =
    String(value)
      .replace(
        /`/g,
        "ˋ"
      )
      .trim();

  if (
    cleaned.length <=
    maxLength
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    Math.max(
      0,
      maxLength - 1
    )
  )}…`;
}

function formatDateTimeFR(
  date = new Date()
) {
  const parts =
    Object.fromEntries(
      new Intl.DateTimeFormat(
        "fr-FR",
        {
          timeZone:
            "Europe/Paris",

          day:
            "2-digit",

          month:
            "2-digit",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",

          hour12:
            false,
        }
      )
        .formatToParts(date)

        .filter(
          (part) =>
            part.type !==
            "literal"
        )

        .map(
          (part) => [
            part.type,
            part.value,
          ]
        )
    );

  return (
    `${parts.day}/` +
    `${parts.month}/` +
    `${parts.year} à ` +
    `${parts.hour}:` +
    `${parts.minute}`
  );
}

function getReviewerRoleId(
  type
) {
  if (
    type === "hc" &&
    HC_STAFF_ROLE_ID
  ) {
    return HC_STAFF_ROLE_ID;
  }

  return STAFF_ROLE_ID;
}

function canProcessRequest(
  member,
  type
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return member.roles.cache.has(
    getReviewerRoleId(
      type
    )
  );
}

function getField(
  interaction,
  id
) {
  try {
    const value =
      interaction
        .fields
        .getTextInputValue(
          id
        );

    return (
      value?.trim() ||
      "Non renseigné"
    );
  } catch {
    return "Non renseigné";
  }
}

function makeInput({
  id,
  label,
  placeholder,
  required = true,
  style =
    TextInputStyle.Short,
  maxLength,
}) {
  const input =
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setRequired(
        required
      )
      .setMaxLength(
        maxLength ??
          (
            style ===
            TextInputStyle.Paragraph
              ? 1500
              : 120
          )
      );

  if (placeholder) {
    input.setPlaceholder(
      placeholder
    );
  }

  return new ActionRowBuilder()
    .addComponents(
      input
    );
}

async function getRequestChannel() {
  const guild =
    client.guilds.cache.get(
      GUILD_ID
    );

  if (!guild) {
    return null;
  }

  return guild.channels
    .fetch(
      REQUEST_CHANNEL_ID
    )
    .catch(
      () => null
    );
}

async function getFreshRequestMessage(messageId) {
  const channel = await getRequestChannel();
  if (!channel || !channel.isTextBased()) return null;
  return channel.messages
    .fetch({ message: messageId, force: true })
    .catch(() => null);
}
async function auditRequestChannelSecurity() {
  const channel =
    await getRequestChannel();

  const guild =
    client.guilds.cache.get(
      GUILD_ID
    );

  if (
    !channel ||
    !guild ||
    !channel.permissionsFor
  ) {
    return;
  }

  const everyonePermissions =
    channel.permissionsFor(
      guild.roles.everyone
    );

  if (
    everyonePermissions?.has(
      PermissionFlagsBits.ViewChannel
    )
  ) {
    console.warn(
      "[SÉCURITÉ] REQUEST_CHANNEL_ID est visible par @everyone. " +
        "Les dossiers et fils de réexamen peuvent exposer des informations internes."
    );
  }
}

function buildContestKey(
  userId,
  requestId
) {
  return (
    `${userId}:${requestId}`
  );
}

function buildContestThreadName(
  user,
  type,
  requestId
) {
  const username =
    user.username

      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      )

      .replace(
        /-+/g,
        "-"
      )

      .slice(
        0,
        25
      );

  const typeName =
    REQUEST_TYPES[
      type
    ]
      .code
      .toLowerCase()

      .normalize(
        "NFD"
      )

      .replace(
        /[\u0300-\u036f]/g,
        ""
      )

      .replace(
        /[^a-z0-9]/g,
        "-"
      )

      .replace(
        /-+/g,
        "-"
      );

  return (
    `contestation-${username}-${typeName}-${requestId.slice(
      -6
    )}`
  ).slice(
    0,
    95
  );
}

async function fetchRecordedThread(
  record
) {
  if (
    !record?.threadId
  ) {
    return null;
  }

  const guild =
    client.guilds.cache.get(
      GUILD_ID
    );

  if (!guild) {
    return null;
  }

  return guild.channels
    .fetch(
      record.threadId
    )
    .catch(
      () => null
    );
}

// ============================================================
// ÉTAT / VERROUS / OUTILS DE COMPOSANTS
// ============================================================

const requestLocks =
  new Set();

const contestLocks =
  new Set();

const contestCreationLocks =
  new Set();

const submissionCooldowns =
  new Map();

function getSubmissionCooldownRemaining(
  userId,
  type,
  duration = 15000
) {
  const key =
    `${userId}:${type}`;

  const now =
    Date.now();

  const last =
    submissionCooldowns.get(
      key
    ) || 0;

  const remaining =
    duration -
    (
      now -
      last
    );

  if (
    remaining > 0
  ) {
    return remaining;
  }

  submissionCooldowns.set(
    key,
    now
  );

  setTimeout(
    () => {
      if (
        submissionCooldowns.get(
          key
        ) === now
      ) {
        submissionCooldowns.delete(
          key
        );
      }
    },

    duration
  );

  return 0;
}

function isAnyStaff(
  member
) {
  if (!member) {
    return false;
  }

  return (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    ) ||

    member.roles.cache.has(
      STAFF_ROLE_ID
    ) ||

    Boolean(
      HC_STAFF_ROLE_ID &&
      member.roles.cache.has(
        HC_STAFF_ROLE_ID
      )
    )
  );
}

function mapMessageComponents(
  message,
  visitor
) {
  const components =
    message.components.map(
      (component) =>
        component.toJSON()
    );

  const walk =
    (component) => {
      visitor(
        component
      );

      if (
        Array.isArray(
          component.components
        )
      ) {
        component.components.forEach(
          walk
        );
      }

      if (
        component.accessory
      ) {
        walk(
          component.accessory
        );
      }
    };

  components.forEach(
    walk
  );

  return components;
}

function getMessageComponentText(
  message
) {
  const chunks = [];

  mapMessageComponents(
    message,

    (component) => {
      if (
        typeof component.content ===
        "string"
      ) {
        chunks.push(
          component.content
        );
      }
    }
  );

  return chunks.join(
    "\n"
  );
}

function getDossierPhase(
  message
) {
  const content =
    getMessageComponentText(
      message
    );

  if (
    content.includes(
      "### // RÉEXAMEN"
    ) &&
    content.includes(
      "`STATUS : UNDER REVIEW`"
    )
  ) {
    return "review_pending";
  }

  if (
    content.includes(
      "### // RÉEXAMEN"
    ) &&
    content.includes(
      "`STATUS : ACCEPTED`"
    )
  ) {
    return "review_accepted";
  }

  if (
    content.includes(
      "### // RÉEXAMEN"
    ) &&
    content.includes(
      "`STATUS : REJECTED`"
    )
  ) {
    return "review_rejected";
  }

  if (
    content.includes(
      "`STATUS : PENDING REVIEW`"
    )
  ) {
    return "pending";
  }

  if (
    content.includes(
      "### // DEMANDE INITIALE"
    ) &&
    content.includes(
      "`STATUS : REJECTED`"
    )
  ) {
    return "rejected";
  }

  if (
    content.includes(
      "### // DEMANDE INITIALE"
    ) &&
    content.includes(
      "`STATUS : ACCEPTED`"
    )
  ) {
    return "accepted";
  }

  return "unknown";
}

function inferInitialDecisionFromMessage(
  message
) {
  const content =
    getMessageComponentText(
      message
    );

  if (
    !content.includes(
      "DEMANDE REFUSÉE"
    )
  ) {
    return null;
  }

  const rejectedAt =
    content.match(
      /\*\*Rejeté le :\*\* `([^`]+)`/
    )?.[1] || "";

  const moderatorId =
    content.match(
      /\*\*Traité par :\*\* <@!?(\d+)>/
    )?.[1] || "";

  const reason =
    content.match(
      /\*\*Motif :\*\* ([^\n]+)/
    )?.[1]?.trim() || "";

  if (
    !rejectedAt &&
    !moderatorId &&
    !reason
  ) {
    return null;
  }

  return {
    rejectedAt:
      rejectedAt ||
      "Date inconnue",

    moderatorId:
      moderatorId ||
      null,

    reason:
      reason ||
      "Aucun motif communiqué.",
  };
}

function getInitialDecision(
  userId,
  requestId,
  message = null
) {
  const key =
    buildContestKey(
      userId,
      requestId
    );

  const saved =
    contestState
      .initialDecisions[
        key
      ];

  if (saved) {
    return saved;
  }

  if (!message) {
    return null;
  }

  const inferred =
    inferInitialDecisionFromMessage(
      message
    );

  if (inferred) {
    contestState
      .initialDecisions[
        key
      ] =
      inferred;

    saveContestState();
  }

  return inferred;
}

function buildSystemNotice(
  title,
  lines,
  accentColor =
    COLORS.OTHER_YELLOW
) {
  return new ContainerBuilder()

    .setAccentColor(
      accentColor
    )

    .addTextDisplayComponents(
      text(
        [
          `### ${title}`,
          "",
          ...(
            Array.isArray(
              lines
            )
              ? lines
              : [
                  lines,
                ]
          ),
        ].join(
          "\n"
        )
      )
    );
}

// ============================================================
// PANNEAU PRINCIPAL
// ============================================================

function accreditationSection({
  title,
  code,
  description,
  customId,
  emoji,
  style =
    ButtonStyle.Primary,
}) {
  const button =
    new ButtonBuilder()

      .setCustomId(
        customId
      )

      .setLabel(
        "DEMANDER"
      )

      .setStyle(
        style
      );

  if (emoji) {
    button.setEmoji(
      emoji
    );
  }

  return new SectionBuilder()

    .addTextDisplayComponents(
      text(
        [
          `### ${title}`,

          `\`${code}\``,

          description,
        ].join(
          "\n"
        )
      )
    )

    .setButtonAccessory(
      button
    );
}

function buildAccreditationPanel() {
  return new ContainerBuilder()

    .setAccentColor(
      COLORS.CMO_BLUE
    )

    .addTextDisplayComponents(
      text(
        [
          "# COALITION MONDIALE OCCULTE",

          "### BUREAU DES ACCRÉDITATIONS",

          "",

          "`CANAL : ACCREDITATION-NET`",

          "`CLASSIFICATION : INTERNE`",

          "`ACCÈS : PERSONNEL AUTORISÉ`",

          "",

          "> Terminal de gestion des accréditations opérationnelles.",

          "> Sélectionnez votre branche afin d'ouvrir votre dossier.",
        ].join(
          "\n"
        )
      )
    )

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          "### // ACCRÉDITATIONS DISPONIBLES",

          "`STATUS : ONLINE`",
        ].join(
          "\n"
        )
      )
    )

    .addSeparatorComponents(
      separator()
    )

    .addSectionComponents(
      accreditationSection({
        title:
          "FANTASSIN PHYSIQUE",

        code:
          "DIVISION // PHYSIQUE",

        description:
          "Personnel d'intervention, de sécurisation et unités opérationnelles.",

        customId:
          "request_physique",

        emoji:
          "🛡️",
      })
    )

    .addSeparatorComponents(
      separator()
    )

    .addSectionComponents(
      accreditationSection({
        title:
          "OPÉRATEUR PTOLÉMÉE",

        code:
          "DIVISION // PTOLÉMÉE",

        description:
          "Personnel rattaché aux opérations et fonctions Ptolémée.",

        customId:
          "request_ptolemee",

        emoji:
          "📡",
      })
    )

    .addSeparatorComponents(
      separator()
    )

    .addSectionComponents(
      accreditationSection({
        title:
          "RECHERCHE & DÉVELOPPEMENT",

        code:
          "DIVISION // R&D",

        description:
          "Personnel scientifique, technique et développement expérimental.",

        customId:
          "request_rd",

        emoji:
          "🧪",
      })
    )

    .addSeparatorComponents(
      separator()
    )

    .addSectionComponents(
      accreditationSection({
        title:
          "HAUT COMMANDEMENT",

        code:
          "CLEARANCE // COMMAND",

        description:
          "Accréditation réservée aux fonctions de commandement supérieur.",

        customId:
          "request_hc",

        emoji:
          "⭐",

        style:
          ButtonStyle.Secondary,
      })
    )

    .addSeparatorComponents(
      separator()
    )

    .addSectionComponents(
      accreditationSection({
        title:
          "DEMANDE PARTICULIÈRE",

        code:
          "ROUTE // MANUAL REVIEW",

        description:
          "Pour toute requête ne correspondant pas aux catégories standards.",

        customId:
          "request_autre",

        emoji:
          "🔹",

        style:
          ButtonStyle.Secondary,
      })
    )

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          "`ACCREDITATION TERMINAL // ONLINE`",

          "`CLASSIFICATION : INTERNE`",

          "",

          "-# Toute fausse déclaration peut entraîner le retrait de vos accréditations.",
        ].join(
          "\n"
        )
      )
    );
}

// ============================================================
// FORMULAIRES
// ============================================================

function buildModal(type) {
  const data =
    REQUEST_TYPES[type];

  const modal =
    new ModalBuilder()
      .setCustomId(
        `modal_${type}`
      )
      .setTitle(
        `CMO // ${data.label}`
      );

  if (
    [
      "physique",
      "ptolemee",
      "rd",
    ].includes(type)
  ) {
    modal.addComponents(
      makeInput({
        id:
          "nom_prenom",

        label:
          "Nom / Prénom",

        placeholder:
          "Ex : John Smith",
      }),

      makeInput({
        id:
          "matricule",

        label:
          "Matricule",

        placeholder:
          "Ex : 0421",
      }),

      makeInput({
        id:
          "nom_code",

        label:
          "Nom de code (facultatif)",

        placeholder:
          'Ex : "Spectre"',

        required:
          false,
      }),

      makeInput({
        id:
          "date_formation",

        label:
          "Date de la formation",

        placeholder:
          "Ex : 21/08/2026",
      })
    );
  }

  if (
    type === "hc"
  ) {
    modal.addComponents(
      makeInput({
        id:
          "matricule",

        label:
          "Matricule",

        placeholder:
          "Ex : 0001",
      }),

      makeInput({
        id:
          "nom_code",

        label:
          "Nom de code",

        placeholder:
          'Ex : "Overwatch"',
      })
    );
  }

  if (
    type === "autre"
  ) {
    modal.addComponents(
      makeInput({
        id:
          "nom_prenom",

        label:
          "Nom / Prénom",

        placeholder:
          "Ex : John Smith",
      }),

      makeInput({
        id:
          "matricule",

        label:
          "Matricule",

        placeholder:
          "Ex : 0421",
      }),

      makeInput({
        id:
          "nom_code",

        label:
          "Nom de code (facultatif)",

        placeholder:
          'Ex : "Spectre"',

        required:
          false,
      }),

      makeInput({
        id:
          "explication",

        label:
          "Expliquez votre demande",

        placeholder:
          "Décrivez précisément votre demande...",

        required:
          true,

        style:
          TextInputStyle.Paragraph,

        maxLength:
          1000,
      })
    );
  }

  return modal;
}

function buildRejectModal(
  type,
  userId,
  messageId
) {
  return new ModalBuilder()

    .setCustomId(
      `reject_reason:${type}:${userId}:${messageId}`
    )

    .setTitle(
      "CMO // Refus du dossier"
    )

    .addComponents(
      makeInput({
        id:
          "reject_reason",

        label:
          "Motif du refus (facultatif)",

        placeholder:
          "Indiquez le motif communiqué au demandeur...",

        required:
          false,

        style:
          TextInputStyle.Paragraph,

        maxLength:
          1000,
      })
    );
}

function buildContestReplyModal(
  userId,
  requestId
) {
  return new ModalBuilder()

    .setCustomId(
      `contest_reply_modal:${userId}:${requestId}`
    )

    .setTitle(
      "CMO // Réponse du Bureau"
    )

    .addComponents(
      makeInput({
        id:
          "reply_message",

        label:
          "Réponse au demandeur",

        placeholder:
          "Rédigez la réponse du Bureau...",

        required:
          true,

        style:
          TextInputStyle.Paragraph,

        maxLength:
          1500,
      })
    );
}

function canUseBureauMessaging(
  member
) {
  return isAnyStaff(
    member
  );
}

// ============================================================
// DOSSIER STAFF
// ============================================================

function buildStaffRequestComponent(
  interaction,
  type
) {
  const data =
    REQUEST_TYPES[type];

  const reviewerRole =
    getReviewerRoleId(
      type
    );

  const nomPrenom =
    safeText(
      getField(
        interaction,
        "nom_prenom"
      ),
      120
    );

  const matricule =
    safeText(
      getField(
        interaction,
        "matricule"
      ),
      120
    );

  const nomCode =
    safeText(
      getField(
        interaction,
        "nom_code"
      ),
      120
    );

  const dateFormation =
    safeText(
      getField(
        interaction,
        "date_formation"
      ),
      120
    );

  const explication =
    safeText(
      getField(
        interaction,
        "explication"
      ),
      1200
    );

  const dossierId =
    `${type.toUpperCase()}-${interaction.user.id.slice(-6)}`;

  const container =
    new ContainerBuilder()

      .setAccentColor(
        data.accentColor
      )

      .addTextDisplayComponents(
        text(
          [
            "## BUREAU DES ACCRÉDITATIONS",

            `### ${data.label.toUpperCase()}`,

            "",

            "**Demandeur**",

            `<@${interaction.user.id}>`,

            "",

            "**Dossier**",

            `\`${dossierId}\``,
          ].join("\n")
        )
      )

      .addSeparatorComponents(
        separator()
      )

      .addTextDisplayComponents(
        text(
          [
            "### // ÉTAT DU DOSSIER",

            "🟡 **EN ATTENTE D'EXAMEN**",

            "",

            "`STATUS : PENDING REVIEW`",
          ].join("\n")
        )
      )

      .addSeparatorComponents(
        separator()
      );

  if (
    [
      "physique",
      "ptolemee",
      "rd",
    ].includes(type)
  ) {
    container.addTextDisplayComponents(
      text(
        [
          "### // IDENTIFICATION",

          "",

          "**Nom / Prénom**",

          `\`${nomPrenom}\``,

          "",

          "**Matricule**",

          `\`${matricule}\``,

          "",

          "**Nom de code**",

          `\`${nomCode}\``,

          "",

          "**Date de formation**",

          `\`${dateFormation}\``,
        ].join("\n")
      )
    );
  }

  if (
    type === "hc"
  ) {
    container.addTextDisplayComponents(
      text(
        [
          "### // IDENTIFICATION",

          "",

          "**Matricule**",

          `\`${matricule}\``,

          "",

          "**Nom de code**",

          `\`${nomCode}\``,
        ].join("\n")
      )
    );
  }

  if (
    type === "autre"
  ) {
    container

      .addTextDisplayComponents(
        text(
          [
            "### // IDENTIFICATION",

            "",

            "**Nom / Prénom**",

            `\`${nomPrenom}\``,

            "",

            "**Matricule**",

            `\`${matricule}\``,

            "",

            "**Nom de code**",

            `\`${nomCode}\``,
          ].join("\n")
        )
      )

      .addSeparatorComponents(
        separator()
      )

      .addTextDisplayComponents(
        text(
          [
            "### // OBJET DE LA DEMANDE",

            "",

            explication,
          ].join("\n")
        )
      );
  }

  container

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          "### // VALIDATION",

          "Ce dossier est en attente d'une décision du personnel habilité.",
        ].join("\n")
      )
    )

    .addActionRowComponents(
      new ActionRowBuilder()

        .addComponents(
          new ButtonBuilder()

            .setCustomId(
              `approve:${type}:${interaction.user.id}`
            )

            .setLabel(
              "ACCEPTER"
            )

            .setEmoji(
              "✅"
            )

            .setStyle(
              ButtonStyle.Success
            ),

          new ButtonBuilder()

            .setCustomId(
              `reject:${type}:${interaction.user.id}`
            )

            .setLabel(
              "REFUSER"
            )

            .setEmoji(
              "❌"
            )

            .setStyle(
              ButtonStyle.Danger
            )
        )
    )

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          `**Personnel habilité :** <@&${reviewerRole}>`,

          "",

          "`CLASSIFICATION : INTERNE`",

          "`BUREAU DES ACCRÉDITATIONS // ARCHIVES`",
        ].join("\n")
      )
    );

  return container;
}

// ============================================================
// DÉCISION INITIALE
// ============================================================

function buildProcessedComponents(
  message,
  action,
  moderatorId,
  rejectReason = "",
  processedDate = new Date()
) {
  const accepted =
    action ===
    "approve";

  const processedAt =
    formatDateTimeFR(
      processedDate
    );

  const cleanReason =
    rejectReason?.trim()
      ? safeText(
          rejectReason.trim(),
          1000
        )
      : "Aucun motif communiqué.";

  return mapMessageComponents(
    message,

    (component) => {
      if (
        typeof component.content ===
        "string"
      ) {
        if (
          component.content.includes(
            "### // ÉTAT DU DOSSIER"
          ) ||

          component.content.includes(
            "### // DEMANDE INITIALE"
          )
        ) {
          component.content =
            accepted
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

        if (
          component.content.includes(
            "### // VALIDATION"
          )
        ) {
          component.content =
            [
              "### // VALIDATION",

              accepted
                ? "Le dossier a été validé."
                : "La demande initiale a été refusée.",
            ].join("\n");
        }
      }

      if (
        component.custom_id?.startsWith(
          "approve:"
        ) ||

        component.custom_id?.startsWith(
          "reject:"
        )
      ) {
        component.disabled =
          true;

        if (
          accepted &&

          component.custom_id.startsWith(
            "approve:"
          )
        ) {
          component.label =
            "DEMANDE ACCEPTÉE";

          component.style =
            ButtonStyle.Success;
        }

        if (
          !accepted &&

          component.custom_id.startsWith(
            "reject:"
          )
        ) {
          component.label =
            "DEMANDE REFUSÉE";

          component.style =
            ButtonStyle.Danger;
        }
      }
    }
  );
}

function buildInitialDecisionHistory(
  decision
) {
  return [
    "### // DÉCISION INITIALE",

    "🔴 **DEMANDE REFUSÉE**",

    "",

    `**Rejeté le :** \`${
      decision?.rejectedAt ||
      "Date inconnue"
    }\``,

    `**Traité par :** ${
      decision?.moderatorId
        ? `<@${decision.moderatorId}>`
        : "Inconnu"
    }`,

    `**Motif :** ${
      decision?.reason ||
      "Aucun motif communiqué."
    }`,
  ].join("\n");
}

function extractReviewContext(
  content
) {
  const openedAt =
    content.match(
      /\*\*Ouvert le :\*\* `([^`]+)`/
    )?.[1] ||
    "";

  const threadId =
    content.match(
      /\*\*Fil :\*\* <#(\d+)>/
    )?.[1] ||
    "";

  return {
    openedLine:
      openedAt
        ? `**Ouvert le :** \`${openedAt}\``
        : "",

    threadLine:
      threadId
        ? `**Fil :** <#${threadId}>`
        : "",
  };
}

// ============================================================
// RÉEXAMEN : ÉTAT DU DOSSIER PRINCIPAL
//
// IMPORTANT :
// Le dernier événement est toujours affiché en premier.
// Il fait directement office d'état courant.
// ============================================================

function buildContestOpenedDossierComponents(
  message,
  threadId,
  initialDecision
) {
  const openedAt =
    formatDateTimeFR();

  return mapMessageComponents(
    message,

    (component) => {
      if (
        typeof component.content !==
        "string"
      ) {
        return;
      }

      if (
        component.content.includes(
          "### // DEMANDE INITIALE"
        ) ||

        component.content.includes(
          "### // ÉTAT DU DOSSIER"
        ) ||

        component.content.includes(
          "### // RÉEXAMEN"
        )
      ) {
        component.content =
          [
            "### // RÉEXAMEN",

            "🟠 **RÉEXAMEN EN COURS**",

            "",

            "`STATUS : UNDER REVIEW`",

            "",

            `**Ouvert le :** \`${openedAt}\``,

            `**Fil :** <#${threadId}>`,

            "",

            buildInitialDecisionHistory(
              initialDecision
            ),
          ].join("\n");
      }

      if (
        component.content.includes(
          "### // VALIDATION"
        )
      ) {
        component.content =
          [
            "### // VALIDATION",

            "Le dossier fait actuellement l'objet d'un réexamen.",
          ].join("\n");
      }
    }
  );
}

function buildContestClosedDossierComponents(
  message,
  moderatorId,
  initialDecision
) {
  const decisionAt =
    formatDateTimeFR();

  return mapMessageComponents(
    message,

    (component) => {
      if (
        typeof component.content ===
        "string"
      ) {
        if (
          component.content.includes(
            "### // RÉEXAMEN"
          )
        ) {
          const {
            openedLine,
            threadLine,
          } =
            extractReviewContext(
              component.content
            );

          component.content =
            [
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

              buildInitialDecisionHistory(
                initialDecision
              ),
            ]

              .filter(
                (
                  line,
                  index,
                  array
                ) =>
                  line !== "" ||
                  array[
                    index - 1
                  ] !== ""
              )

              .join("\n");
        }

        if (
          component.content.includes(
            "### // VALIDATION"
          )
        ) {
          component.content =
            [
              "### // VALIDATION",

              "Réexamen terminé. La décision initiale est maintenue.",
            ].join("\n");
        }
      }

      if (
        component.custom_id?.startsWith(
          "approve:"
        )
      ) {
        component.disabled =
          true;

        component.label =
          "DOSSIER REFUSÉ";

        component.style =
          ButtonStyle.Secondary;
      }

      if (
        component.custom_id?.startsWith(
          "reject:"
        )
      ) {
        component.disabled =
          true;

        component.label =
          "RÉEXAMEN REFUSÉ";

        component.style =
          ButtonStyle.Danger;

        component.emoji = {
          name:
            "❌",
        };
      }
    }
  );
}

function buildAppealAcceptedComponents(
  message,
  moderatorId,
  initialDecision
) {
  const decisionAt =
    formatDateTimeFR();

  return mapMessageComponents(
    message,

    (component) => {
      if (
        typeof component.content ===
        "string"
      ) {
        if (
          component.content.includes(
            "### // RÉEXAMEN"
          )
        ) {
          const {
            openedLine,
            threadLine,
          } =
            extractReviewContext(
              component.content
            );

          component.content =
            [
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

              buildInitialDecisionHistory(
                initialDecision
              ),
            ]

              .filter(
                (
                  line,
                  index,
                  array
                ) =>
                  line !== "" ||
                  array[
                    index - 1
                  ] !== ""
              )

              .join("\n");
        }

        if (
          component.content.includes(
            "### // VALIDATION"
          )
        ) {
          component.content =
            [
              "### // VALIDATION",

              "Réexamen terminé. Le dossier est désormais validé.",
            ].join("\n");
        }
      }

      if (
        component.custom_id?.startsWith(
          "approve:"
        )
      ) {
        component.disabled =
          true;

        component.label =
          "DOSSIER VALIDÉ";

        component.style =
          ButtonStyle.Success;

        component.emoji = {
          name:
            "✅",
        };
      }

      if (
        component.custom_id?.startsWith(
          "reject:"
        )
      ) {
        component.disabled =
          true;

        component.label =
          "RÉEXAMEN ACCEPTÉ";

        component.style =
          ButtonStyle.Success;

        component.emoji = {
          name:
            "✅",
        };
      }
    }
  );
}

// ============================================================
// NOTIFICATIONS JOUEUR
// ============================================================

function buildAcceptDMComponent(
  data
) {
  return new ContainerBuilder()

    .setAccentColor(
      data.accentColor
    )

    .addTextDisplayComponents(
      text(
        [
          "## BUREAU DES ACCRÉDITATIONS",

          "### NOTIFICATION DE DOSSIER",

          "",

          "🟢 **DEMANDE ACCEPTÉE**",

          "",

          `Votre demande **${data.label}** a été validée.`,
        ].join("\n")
      )
    )

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        [
          data.roleId
            ? "Votre accréditation Discord a été attribuée."
            : "Votre demande particulière a été validée.",

          "",

          "`STATUS : ACCEPTED`",
        ].join("\n")
      )
    );
}

function buildRejectDMComponent(
  data,
  reason,
  type,
  userId,
  requestId
) {
  const cleanReason =
    reason?.trim()
      ? safeText(
          reason.trim(),
          1000
        )
      : "";

  const sentence =
    type === "autre"
      ? "Votre **demande particulière** n'a pas été validée."
      : `Votre demande d'accréditation **${data.label}** n'a pas été validée.`;

  const container =
    new ContainerBuilder()

      .setAccentColor(
        data.accentColor
      )

      .addTextDisplayComponents(
        text(
          [
            "## BUREAU DES ACCRÉDITATIONS",

            "### NOTIFICATION DE DOSSIER",

            "",

            "🔴 **DEMANDE REFUSÉE**",

            "",

            sentence,
          ].join("\n")
        )
      )

      .addSeparatorComponents(
        separator()
      );

  container

    .addTextDisplayComponents(
      text(
        cleanReason
          ? [
              "### // MOTIF DU REFUS",

              "",

              `> ${cleanReason.replace(
                /\n/g,
                "\n> "
              )}`,
            ].join("\n")

          : "Aucun motif n'a été communiqué."
      )
    )

    .addSeparatorComponents(
      separator()
    )

    .addTextDisplayComponents(
      text(
        "Si vous souhaitez demander le réexamen de cette décision, utilisez le bouton ci-dessous."
      )
    )

    .addActionRowComponents(
      new ActionRowBuilder()

        .addComponents(
          new ButtonBuilder()

            .setCustomId(
              `contest_open:${type}:${userId}:${requestId}`
            )

            .setLabel(
              "CONTESTER CETTE DÉCISION"
            )

            .setEmoji(
              "📨"
            )

            .setStyle(
              ButtonStyle.Primary
            )
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

function buildContestOpenedDM(
  data
) {
  return buildSystemNotice(
    "🟠 RÉEXAMEN OUVERT",

    [
      `Dossier : **${data.label}**`,

      "",

      "Vous pouvez maintenant écrire directement ici. Vos messages seront transmis au Bureau.",
    ]
  );
}

function buildContestAlreadyClosedDM() {
  return buildSystemNotice(
    "🔒 RÉEXAMEN DÉJÀ CLÔTURÉ",

    [
      "Cette décision a déjà fait l'objet d'un réexamen.",

      "",

      "Aucune nouvelle contestation ne peut être ouverte depuis cette notification.",
    ]
  );
}

function buildContestAcceptedDM(
  data
) {
  return buildSystemNotice(
    "✅ RÉEXAMEN ACCEPTÉ",

    [
      `Votre demande concernant **${data.label}** a été réexaminée.`,

      "",

      "**La décision initiale a été révisée et votre demande est désormais acceptée.**",

      "",

      data.roleId
        ? "Votre accréditation Discord a été attribuée."
        : "Votre demande particulière a été validée.",
    ],

    COLORS.SUCCESS
  );
}

function buildContestRejectedDM(
  data
) {
  return buildSystemNotice(
    "❌ RÉEXAMEN TERMINÉ",

    [
      `Votre demande de réexamen concernant **${data.label}** n'a pas été retenue.`,

      "",

      "La décision initiale reste inchangée.",
    ],

    COLORS.STAFF_RED
  );
}

// ============================================================
// FIL DE RÉEXAMEN CÔTÉ STAFF
// ============================================================

function buildContestHeaderComponent(
  user,
  type,
  requestId
) {
  const data =
    REQUEST_TYPES[
      type
    ];

  return new ContainerBuilder()

    .setAccentColor(
      COLORS.OTHER_YELLOW
    )

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

          `\`${data.label}\``,

          "",

          "**Dossier source**",

          `\`${requestId}\``,
        ].join("\n")
      )
    )

    .addSeparatorComponents(
      separator()
    )

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

    .addSeparatorComponents(
      separator()
    )

    .addActionRowComponents(
      new ActionRowBuilder()

        .addComponents(
          new ButtonBuilder()

            .setCustomId(
              `contest_accept:${user.id}:${requestId}`
            )

            .setLabel(
              "ACCEPTER LA DEMANDE"
            )

            .setEmoji(
              "✅"
            )

            .setStyle(
              ButtonStyle.Success
            ),

          new ButtonBuilder()

            .setCustomId(
              `contest_reply:${user.id}:${requestId}`
            )

            .setLabel(
              "RÉPONDRE"
            )

            .setEmoji(
              "💬"
            )

            .setStyle(
              ButtonStyle.Primary
            ),

          new ButtonBuilder()

            .setCustomId(
              `contest_close:${user.id}:${requestId}`
            )

            .setLabel(
              "REFUSER LE RÉEXAMEN"
            )

            .setEmoji(
              "❌"
            )

            .setStyle(
              ButtonStyle.Danger
            )
        )
    );
}

function buildIncomingContestComponent(
  user,
  content,
  attachments,
  requestId
) {
  const container =
    new ContainerBuilder()

      .setAccentColor(
        COLORS.CMO_BLUE
      )

      .addTextDisplayComponents(
        text(
          [
            `### 📥 ${safeText(
              user.username,
              80
            )}`,

            "",

            content,
          ].join("\n")
        )
      );

  if (
    attachments.length >
    0
  ) {
    container

      .addSeparatorComponents(
        separator()
      )

      .addTextDisplayComponents(
        text(
          attachments.join(
            "\n"
          )
        )
      );
  }

  container
    .addActionRowComponents(
      new ActionRowBuilder()

        .addComponents(
          new ButtonBuilder()

            .setCustomId(
              `contest_reply:${user.id}:${requestId}`
            )

            .setLabel(
              "RÉPONDRE"
            )

            .setEmoji(
              "💬"
            )

            .setStyle(
              ButtonStyle.Primary
            )
        )
    );

  return container;
}

function buildOutgoingContestComponent(
  message,
  moderator
) {
  return new ContainerBuilder()

    .setAccentColor(
      COLORS.STAFF_RED
    )

    .addTextDisplayComponents(
      text(
        [
          "### 📤 BUREAU",

          "",

          message,

          "",

          `-# ${safeText(
            moderator.username,
            80
          )} — interne`,
        ].join("\n")
      )
    );
}

function buildContestAcceptedStaffComponent(
  moderator
) {
  const processedAt =
    formatDateTimeFR();

  return new ContainerBuilder()

    .setAccentColor(
      COLORS.SUCCESS
    )

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

function buildContestClosedComponent(
  moderator
) {
  const processedAt =
    formatDateTimeFR();

  return new ContainerBuilder()

    .setAccentColor(
      COLORS.STAFF_RED
    )

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

// ============================================================
// CRÉATION / RÉCUPÉRATION DU FIL
// ============================================================

async function getOrCreateContestThread({
  user,
  type,
  requestId,
}) {
  const key =
    buildContestKey(
      user.id,
      requestId
    );

  // ==========================================================
  // EMPÊCHE DEUX CONTESTATIONS ACTIVES POUR LE MÊME JOUEUR
  // ==========================================================

  const activeKey =
    contestState
      .activeByUser[
        user.id
      ];

  if (
    activeKey &&
    activeKey !== key
  ) {
    const activeRecord =
      contestState.records[
        activeKey
      ];

    if (
      activeRecord?.status ===
      "open"
    ) {
      const activeThread =
        await fetchRecordedThread(
          activeRecord
        );

      if (
        activeThread &&
        !activeThread.locked
      ) {
        return {
          key,

          thread:
            activeThread,

          record:
            activeRecord,

          closed:
            false,

          created:
            false,

          conflict:
            true,

          busy:
            false,
        };
      }

      activeRecord.status =
        "closed";

      delete contestState
        .activeByUser[
          user.id
        ];

      saveContestState();
    }
  }

  // ==========================================================
  // CONTESTATION DÉJÀ CONNUE
  // ==========================================================

  const existing =
    contestState.records[
      key
    ];

  if (existing) {
    // Un ancien recours terminé ne doit jamais se rouvrir.
    if (
      existing.status !==
      "open"
    ) {
      return {
        key,

        thread:
          null,

        record:
          existing,

        closed:
          true,

        created:
          false,

        conflict:
          false,

        busy:
          false,
      };
    }

    const thread =
      await fetchRecordedThread(
        existing
      );

    if (thread) {
      if (
        thread.locked
      ) {
        existing.status =
          "closed";

        if (
          contestState
            .activeByUser[
              user.id
            ] === key
        ) {
          delete contestState
            .activeByUser[
              user.id
            ];
        }

        saveContestState();

        return {
          key,

          thread:
            null,

          record:
            existing,

          closed:
            true,

          created:
            false,

          conflict:
            false,

          busy:
            false,
        };
      }

      if (
        thread.archived
      ) {
        await thread
          .setArchived(
            false
          )
          .catch(
            () => {}
          );
      }

      if (
        !existing.openedAt
      ) {
        existing.openedAt =
          formatDateTimeFR();
      }

      contestState
        .activeByUser[
          user.id
        ] = key;

      saveContestState();

      return {
        key,

        thread,

        record:
          existing,

        closed:
          false,

        created:
          false,

        conflict:
          false,

        busy:
          false,
      };
    }
  }

  // ==========================================================
  // VERROU DE CRÉATION
  // Évite deux fils si le joueur double-clique.
  // ==========================================================

  if (
    contestCreationLocks.has(
      key
    )
  ) {
    return {
      key,

      thread:
        null,

      record:
        existing || null,

      closed:
        false,

      created:
        false,

      conflict:
        false,

      busy:
        true,
    };
  }

  contestCreationLocks.add(
    key
  );

  try {
    // --------------------------------------------------------
    // RELECTURE APRÈS PRISE DU VERROU
    // --------------------------------------------------------

    const recheck =
      contestState.records[
        key
      ];

    if (
      recheck?.status ===
      "open"
    ) {
      const thread =
        await fetchRecordedThread(
          recheck
        );

      if (
        thread &&
        !thread.locked
      ) {
        contestState
          .activeByUser[
            user.id
          ] = key;

        saveContestState();

        return {
          key,

          thread,

          record:
            recheck,

          closed:
            false,

          created:
            false,

          conflict:
            false,

          busy:
            false,
        };
      }
    }

    // --------------------------------------------------------
    // CRÉATION DU FIL
    // --------------------------------------------------------

    const requestChannel =
      await getRequestChannel();

    if (
      !requestChannel ||
      !requestChannel.threads
    ) {
      throw new Error(
        "Création de fil impossible."
      );
    }

    const thread =
      await requestChannel
        .threads
        .create({
          name:
            buildContestThreadName(
              user,
              type,
              requestId
            ),

          autoArchiveDuration:
            1440,

          reason:
            `Réexamen ${REQUEST_TYPES[type].label} — ${safeText(
              user.username,
              80
            )}`,
        });

    const record = {
      threadId:
        thread.id,

      userId:
        user.id,

      type,

      requestId,

      status:
        "open",

      openedAt:
        formatDateTimeFR(),
    };

    contestState.records[
      key
    ] = record;

    contestState
      .activeByUser[
        user.id
      ] = key;

    saveContestState();

    // --------------------------------------------------------
    // EN-TÊTE STAFF
    // --------------------------------------------------------

    await thread.send({
      components: [
        buildContestHeaderComponent(
          user,
          type,
          requestId
        ),
      ],

      flags:
        MessageFlags.IsComponentsV2,

      allowedMentions: {
        parse: [],
      },
    });

    return {
      key,

      thread,

      record,

      closed:
        false,

      created:
        true,

      conflict:
        false,

      busy:
        false,
    };
  } finally {
    contestCreationLocks.delete(
      key
    );
  }
}

// ============================================================
// DM JOUEUR -> FIL STAFF
// ============================================================

client.on(
  Events.MessageCreate,

  async (message) => {
    try {
      // --------------------------------------------------------
      // IGNORE BOTS + MESSAGES DE SERVEUR
      // --------------------------------------------------------

      if (
        message.author.bot ||
        message.guild
      ) {
        return;
      }

      // ========================================================
      // DEBUG : !debugclear
      // STAFF UNIQUEMENT
      // ========================================================

      if (
        message.content
          .trim()
          .toLowerCase() ===
        "!debugclear"
      ) {
        const guild =
          client.guilds.cache.get(
            GUILD_ID
          );

        const member =
          guild
            ? await guild.members
                .fetch(
                  message.author.id
                )
                .catch(
                  () => null
                )
            : null;

        // Un joueur normal ne peut pas utiliser
        // la commande de debug.
        if (
          !isAnyStaff(
            member
          )
        ) {
          return;
        }

        try {
          const messages =
            await message
              .channel
              .messages
              .fetch({
                limit:
                  100,
              });

          const botMessages =
            messages.filter(
              (msg) =>
                msg.author.id ===
                client.user.id
            );

          let deletedCount =
            0;

          for (
            const botMessage
            of botMessages.values()
          ) {
            try {
              await botMessage
                .delete();

              deletedCount++;
            } catch {
              // Ignore les messages devenus
              // impossibles à supprimer.
            }
          }

          console.log(
            `[DEBUG] ${deletedCount} DM du bot supprimés pour ${message.author.username}.`
          );

          const confirmation =
            await message
              .channel
              .send(
                `🧹 Nettoyage terminé — ${deletedCount} message(s) du bot supprimé(s).`
              );

          setTimeout(
            () => {
              confirmation
                .delete()
                .catch(
                  () => {}
                );
            },

            3000
          );
        } catch (error) {
          console.error(
            "[DEBUG CLEAR] Erreur :",
            error
          );
        }

        return;
      }

      // --------------------------------------------------------
      // MESSAGE VIDE
      // --------------------------------------------------------

      if (
        !message.content.trim() &&
        message.attachments.size ===
          0
      ) {
        return;
      }

      // --------------------------------------------------------
      // CONTESTATION ACTIVE
      // --------------------------------------------------------

      const activeKey =
        contestState
          .activeByUser[
            message.author.id
          ];

      if (!activeKey) {
        await message.author
          .send({
            components: [
              buildNoActiveContestDM(),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          })
          .catch(
            () => {}
          );

        return;
      }

      const record =
        contestState.records[
          activeKey
        ];

      // --------------------------------------------------------
      // ÉTAT PÉRIMÉ
      // --------------------------------------------------------

      if (
        !record ||
        record.status !==
          "open"
      ) {
        delete contestState
          .activeByUser[
            message.author.id
          ];

        saveContestState();

        await message.author
          .send({
            components: [
              buildNoActiveContestDM(),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          })
          .catch(
            () => {}
          );

        return;
      }

      // --------------------------------------------------------
      // RÉCUPÈRE LE FIL
      // --------------------------------------------------------

      const thread =
        await fetchRecordedThread(
          record
        );

      if (
        !thread ||
        thread.locked
      ) {
        record.status =
          "closed";

        delete contestState
          .activeByUser[
            message.author.id
          ];

        saveContestState();

        await message.author
          .send({
            components: [
              buildNoActiveContestDM(),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          })
          .catch(
            () => {}
          );

        return;
      }

      if (
        thread.archived
      ) {
        await thread
          .setArchived(
            false
          )
          .catch(
            () => {}
          );
      }

      // --------------------------------------------------------
      // TEXTE JOUEUR
      // --------------------------------------------------------

      const content =
        message.content.trim()
          ? safeText(
              message.content.trim(),
              1800
            )
          : "*Pièce jointe uniquement.*";

      // --------------------------------------------------------
      // PIÈCES JOINTES
      // --------------------------------------------------------

      const attachments =
        [
          ...message
            .attachments
            .values(),
        ].map(
          (attachment) =>
            `[${safeText(
              attachment.name ||
                "Pièce jointe",
              120
            )}](${attachment.url})`
        );

      // --------------------------------------------------------
      // TRANSMISSION AU STAFF
      // IMPORTANT :
      // aucune mention utilisateur n'est interprétée.
      // --------------------------------------------------------

      await thread.send({
        components: [
          buildIncomingContestComponent(
            message.author,
            content,
            attachments,
            record.requestId
          ),
        ],

        flags:
          MessageFlags.IsComponentsV2,

        allowedMentions: {
          parse: [],
        },
      });

      // Accusé de réception discret.
      await message
        .react(
          "📩"
        )
        .catch(
          () => {}
        );
    } catch (error) {
      console.error(
        "[DM] Erreur :",
        error
      );
    }
  }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  Events.InteractionCreate,

  async (interaction) => {
    try {
      // ========================================================
      // /accreditations
      // ========================================================

      if (
        interaction.isChatInputCommand()
      ) {
        if (
          interaction.commandName !==
          "accreditations"
        ) {
          return;
        }

        await interaction.reply({
          content:
            "Terminal d'accréditation publié.",

          flags:
            MessageFlags.Ephemeral,
        });

        await interaction.channel.send({
          components: [
            buildAccreditationPanel(),
          ],

          flags:
            MessageFlags.IsComponentsV2,
        });

        return;
      }

      // ========================================================
      // BOUTONS DE DEMANDE
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId
          .startsWith(
            "request_"
          )
      ) {
        const type =
          interaction.customId
            .replace(
              "request_",
              ""
            );

        if (
          !REQUEST_TYPES[
            type
          ]
        ) {
          return interaction.reply({
            content:
              "Type de demande inconnu.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        await interaction.showModal(
          buildModal(
            type
          )
        );

        return;
      }

      // ========================================================
      // ACCEPTER UNE DEMANDE INITIALE
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId
          .startsWith(
            "approve:"
          )
      ) {
        const [
          ,
          type,
          userId,
        ] =
          interaction.customId
            .split(
              ":"
            );

        if (
          !REQUEST_TYPES[
            type
          ]
        ) {
          return;
        }

        // ------------------------------------------------------
        // PERMISSION
        // ------------------------------------------------------

        if (
          !canProcessRequest(
            interaction.member,
            type
          )
        ) {
          return interaction.reply({
            content:
              "⛔ Accès refusé.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        const requestId =
          interaction.message.id;

        // ------------------------------------------------------
        // VERROU ANTI DOUBLE TRAITEMENT
        // ------------------------------------------------------

        if (
          requestLocks.has(
            requestId
          )
        ) {
          return interaction.reply({
            content:
              "⏳ Ce dossier est déjà en cours de traitement.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        requestLocks.add(
          requestId
        );

        try {
          // ----------------------------------------------------
          // LE DOSSIER DOIT ENCORE ÊTRE EN ATTENTE
          // ----------------------------------------------------

          if (
            getDossierPhase(
              interaction.message
            ) !==
            "pending"
          ) {
            return interaction.reply({
              content:
                "⚠️ Ce dossier a déjà été traité.",

              flags:
                MessageFlags.Ephemeral,
            });
          }

          // ----------------------------------------------------
          // DEMANDEUR
          // ----------------------------------------------------

          const member =
            await interaction
              .guild
              .members
              .fetch(
                userId
              )
              .catch(
                () => null
              );

          if (!member) {
            return interaction.reply({
              content:
                "❌ Demandeur introuvable.",

              flags:
                MessageFlags.Ephemeral,
            });
          }

          const data =
            REQUEST_TYPES[
              type
            ];

          let roleAddedNow =
            null;

          try {
            // --------------------------------------------------
            // ATTRIBUTION DU RÔLE
            // --------------------------------------------------

            if (
              data.roleId
            ) {
              const role =
                interaction.guild
                  .roles
                  .cache
                  .get(
                    data.roleId
                  );

              if (!role) {
                return interaction.reply({
                  content:
                    "❌ Rôle introuvable.",

                  flags:
                    MessageFlags.Ephemeral,
                });
              }

              const alreadyHadRole =
                member.roles.cache.has(
                  role.id
                );

              if (
                !alreadyHadRole
              ) {
                await member.roles.add(
                  role
                );

                roleAddedNow =
                  role;
              }
            }

            // --------------------------------------------------
            // MODIFICATION DU DOSSIER
            // --------------------------------------------------

            await interaction.update({
              components:
                buildProcessedComponents(
                  interaction.message,
                  "approve",
                  interaction.user.id
                ),
            });
          } catch (error) {
            // Si Discord refuse la modification du dossier
            // après attribution du rôle, on tente de revenir
            // à l'état précédent.
            if (
              roleAddedNow
            ) {
              await member.roles
                .remove(
                  roleAddedNow
                )
                .catch(
                  () => {}
                );
            }

            throw error;
          }

          // ----------------------------------------------------
          // NOTIFICATION JOUEUR
          // ----------------------------------------------------

          await member
            .send({
              components: [
                buildAcceptDMComponent(
                  data
                ),
              ],

              flags:
                MessageFlags.IsComponentsV2,
            })
            .catch(
              () => {}
            );

          return;
        } finally {
          requestLocks.delete(
            requestId
          );
        }
      }

      // ========================================================
      // REFUSER UNE DEMANDE INITIALE
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId
          .startsWith(
            "reject:"
          )
      ) {
        const [
          ,
          type,
          userId,
        ] =
          interaction.customId
            .split(
              ":"
            );

        if (
          !REQUEST_TYPES[
            type
          ] ||

          !canProcessRequest(
            interaction.member,
            type
          )
        ) {
          return interaction.reply({
            content:
              "⛔ Accès refusé.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        // Une vieille interaction ne doit pas
        // pouvoir refuser un dossier déjà traité.
        if (
          getDossierPhase(
            interaction.message
          ) !==
          "pending"
        ) {
          return interaction.reply({
            content:
              "⚠️ Ce dossier a déjà été traité.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        await interaction.showModal(
          buildRejectModal(
            type,
            userId,
            interaction.message.id
          )
        );

        return;
      }

      // ========================================================
      // JOUEUR : OUVRIR LE RÉEXAMEN
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId
          .startsWith(
            "contest_open:"
          )
      ) {
        const [
          ,
          type,
          userId,
          requestId,
        ] =
          interaction.customId
            .split(
              ":"
            );

        // ------------------------------------------------------
        // LE BOUTON APPARTIENT AU DEMANDEUR
        // ------------------------------------------------------

        if (
          interaction.user.id !==
          userId
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "⛔ ACCÈS REFUSÉ",

                "Cette décision ne vous appartient pas.",

                COLORS.STAFF_RED
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // TYPE DE DOSSIER
        // ------------------------------------------------------

        if (
          !REQUEST_TYPES[
            type
          ]
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "⚠️ DOSSIER INCONNU",

                "Le dossier lié à cette notification est introuvable."
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // DOSSIER SOURCE
        // ------------------------------------------------------

        const requestChannel =
          await getRequestChannel();

        if (
          !requestChannel ||
          !requestChannel.isTextBased()
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "⚠️ SERVICE INDISPONIBLE",

                "Le Bureau ne peut pas ouvrir ce réexamen pour le moment."
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        const originalMessage = await getFreshRequestMessage(requestId);

        if (
          !originalMessage
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "⚠️ DOSSIER INTROUVABLE",

                "Le dossier source n'existe plus ou n'est plus accessible."
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // VÉRIFIE QUE LA DÉCISION EST BIEN CONTESTABLE
        // ------------------------------------------------------

        const contestKey = buildContestKey(userId, requestId);
        const savedContest = contestState.records[contestKey];

        // L'état persistant du recours est prioritaire. Une fois un
        // réexamen clôturé, un ancien bouton de DM ne doit jamais le rouvrir.
        if (savedContest && savedContest.status !== "open") {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "🔒 RÉEXAMEN INDISPONIBLE",
                "Cette décision a déjà fait l'objet d'un réexamen clôturé."
              ),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        // Le refus initial est enregistré AVANT l'envoi du DM. Cela évite
        // de dépendre du cache Discord.js, qui peut encore contenir la version
        // PENDING du dossier tant que le processus Node reste actif.
        let initialDecision = contestState.initialDecisions[contestKey] || null;

        if (!initialDecision) {
          const phase = getDossierPhase(originalMessage);
          if (["accepted", "review_accepted", "review_rejected"].includes(phase)) {
            return interaction.reply({
              components: [
                buildSystemNotice(
                  "🔒 RÉEXAMEN INDISPONIBLE",
                  "Cette décision ne peut plus être contestée depuis cette notification."
                ),
              ],
              flags: MessageFlags.IsComponentsV2,
            });
          }

          initialDecision = getInitialDecision(
            userId,
            requestId,
            originalMessage
          );

          // Compatibilité avec d'anciennes notifications : si le message
          // est bien refusé (ou illisible en Components V2), le bouton signé
          // par userId/requestId reste suffisant pour autoriser l'ouverture.
          if (!initialDecision && !["rejected", "review_pending", "unknown"].includes(phase)) {
            return interaction.reply({
              components: [
                buildSystemNotice(
                  "🔒 RÉEXAMEN INDISPONIBLE",
                  "Le dossier source n'est pas dans un état contestable."
                ),
              ],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        }

        initialDecision = initialDecision || {
          rejectedAt: "Date inconnue",
          moderatorId: null,
          reason: "Aucun motif communiqué.",
        };

        // ------------------------------------------------------
        // CRÉATION / RÉCUPÉRATION DU FIL
        // ------------------------------------------------------

        const result =
          await getOrCreateContestThread({
            user:
              interaction.user,

            type,

            requestId,
          });

        // ------------------------------------------------------
        // AUTRE CONTESTATION ACTIVE
        // ------------------------------------------------------

        if (
          result.conflict
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "🟠 RÉEXAMEN DÉJÀ ACTIF",

                [
                  "Vous avez déjà un autre réexamen ouvert.",

                  "",

                  "Terminez-le avant d'en ouvrir un nouveau afin d'éviter de mélanger les échanges.",
                ]
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // DOUBLE CLIC / CRÉATION SIMULTANÉE
        // ------------------------------------------------------

        if (
          result.busy
        ) {
          return interaction.reply({
            components: [
              buildSystemNotice(
                "⏳ OUVERTURE EN COURS",

                "Le réexamen est déjà en cours d'ouverture. Réessayez dans quelques secondes."
              ),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // CONTESTATION DÉJÀ TERMINÉE
        // ------------------------------------------------------

        if (
          result.closed
        ) {
          return interaction.reply({
            components: [
              buildContestAlreadyClosedDM(),
            ],

            flags:
              MessageFlags.IsComponentsV2,
          });
        }

        // ------------------------------------------------------
        // MET À JOUR LE DOSSIER PRINCIPAL
        // ------------------------------------------------------

        if (
          result.thread &&

          (
            result.created ||
            phase ===
              "rejected"
          )
        ) {
          await originalMessage.edit({
            components:
              buildContestOpenedDossierComponents(
                originalMessage,

                result.thread.id,

                initialDecision
              ),
          });
        }

        // ------------------------------------------------------
        // NOTIFICATION JOUEUR
        // ------------------------------------------------------

        await interaction.reply({
          components: [
            buildContestOpenedDM(
              REQUEST_TYPES[
                type
              ]
            ),
          ],

          flags:
            MessageFlags.IsComponentsV2,
        });

        return;
      }

      // ========================================================
      // STAFF : RÉPONDRE AU JOUEUR
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId
          .startsWith(
            "contest_reply:"
          )
      ) {
        const [
          ,
          userId,
          requestId,
        ] =
          interaction.customId
            .split(
              ":"
            );

        const key =
          buildContestKey(
            userId,
            requestId
          );

        // Une décision est peut-être en train
        // d'être enregistrée.
        if (
          contestLocks.has(
            key
          )
        ) {
          return interaction.reply({
            content:
              "⏳ Une décision est en cours sur ce réexamen.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        const record =
          contestState.records[
            key
          ];

        if (
          !record ||
          record.status !==
            "open"
        ) {
          return interaction.reply({
            content:
              "❌ Ce réexamen n'est plus ouvert.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        // Utilise la permission propre au type
        // de dossier, y compris pour le HC.
        if (
          !canProcessRequest(
            interaction.member,
            record.type
          )
        ) {
          return interaction.reply({
            content:
              "⛔ Accès refusé.",

            flags:
              MessageFlags.Ephemeral,
          });
        }

        await interaction.showModal(
          buildContestReplyModal(
            userId,
            requestId
          )
        );

        return;
      }

      // ========================================================
      // STAFF : ACCEPTER APRÈS RÉEXAMEN
      // ========================================================
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("contest_accept:")
      ) {
        const [, userId, requestId] = interaction.customId.split(":");
        const key = buildContestKey(userId, requestId);

        if (contestLocks.has(key)) {
          return interaction.reply({
            content: "⏳ Une décision est déjà en cours sur ce réexamen.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const record = contestState.records[key];
        if (!record || record.status !== "open") {
          return interaction.reply({
            content: "❌ Ce réexamen n'est plus ouvert.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!canProcessRequest(interaction.member, record.type)) {
          return interaction.reply({
            content: "⛔ Accès refusé.",
            flags: MessageFlags.Ephemeral,
          });
        }

        contestLocks.add(key);

        try {
          await interaction.deferUpdate();

          const data = REQUEST_TYPES[record.type];
          const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

          if (!member) {
            throw new Error("Demandeur introuvable.");
          }

          const requestChannel = await getRequestChannel();
          const originalMessage = await getFreshRequestMessage(requestId);

          if (!originalMessage) {
            throw new Error("Dossier source introuvable.");
          }

          const initialDecision =
            getInitialDecision(userId, requestId, originalMessage) || {
              rejectedAt: "Date inconnue",
              moderatorId: null,
              reason: "Aucun motif communiqué.",
            };

          let roleAddedNow = null;

          try {
            if (data.roleId) {
              const role = interaction.guild.roles.cache.get(data.roleId);

              if (!role) {
                throw new Error("Rôle d'accréditation introuvable.");
              }

              if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                roleAddedNow = role;
              }
            }

            await originalMessage.edit({
              components: buildAppealAcceptedComponents(
                originalMessage,
                interaction.user.id,
                initialDecision
              ),
            });
          } catch (error) {
            if (roleAddedNow) {
              await member.roles.remove(roleAddedNow).catch(() => {});
            }

            throw error;
          }

          record.status = "accepted";
          record.closedAt = formatDateTimeFR();
          record.closedBy = interaction.user.id;

          if (contestState.activeByUser[userId] === key) {
            delete contestState.activeByUser[userId];
          }

          saveContestState();

          const thread = await fetchRecordedThread(record);

          if (thread) {
            await interaction.message
              .edit({
                components: [
                  buildContestAcceptedStaffComponent(interaction.user),
                ],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});

            await thread.setLocked(true).catch(() => {});
            await thread.setArchived(true).catch(() => {});
          }

          await member
            .send({
              components: [buildContestAcceptedDM(data)],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => {});

          return;
        } finally {
          contestLocks.delete(key);
        }
      }

      // ========================================================
      // STAFF : REFUSER LE RÉEXAMEN
      // ========================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("contest_close:")
      ) {
        const [, userId, requestId] = interaction.customId.split(":");
        const key = buildContestKey(userId, requestId);

        if (contestLocks.has(key)) {
          return interaction.reply({
            content: "⏳ Une décision est déjà en cours sur ce réexamen.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const record = contestState.records[key];
        if (!record || record.status !== "open") {
          return interaction.reply({
            content: "❌ Ce réexamen n'est plus ouvert.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!canProcessRequest(interaction.member, record.type)) {
          return interaction.reply({
            content: "⛔ Accès refusé.",
            flags: MessageFlags.Ephemeral,
          });
        }

        contestLocks.add(key);

        try {
          await interaction.deferUpdate();

          const data = REQUEST_TYPES[record.type];
          const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

          const requestChannel = await getRequestChannel();
          const originalMessage = await getFreshRequestMessage(requestId);

          if (!originalMessage) {
            throw new Error("Dossier source introuvable.");
          }

          const initialDecision =
            getInitialDecision(userId, requestId, originalMessage) || {
              rejectedAt: "Date inconnue",
              moderatorId: null,
              reason: "Aucun motif communiqué.",
            };

          await originalMessage.edit({
            components: buildContestClosedDossierComponents(
              originalMessage,
              interaction.user.id,
              initialDecision
            ),
          });

          record.status = "rejected";
          record.closedAt = formatDateTimeFR();
          record.closedBy = interaction.user.id;

          if (contestState.activeByUser[userId] === key) {
            delete contestState.activeByUser[userId];
          }

          saveContestState();

          const thread = await fetchRecordedThread(record);

          if (thread) {
            await interaction.message
              .edit({
                components: [buildContestClosedComponent(interaction.user)],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});

            await thread.setLocked(true).catch(() => {});
            await thread.setArchived(true).catch(() => {});
          }

          if (member) {
            await member
              .send({
                components: [buildContestRejectedDM(data)],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});
          }

          return;
        } finally {
          contestLocks.delete(key);
        }
      }

      // ========================================================
      // FORMULAIRE : NOUVELLE DEMANDE
      // ========================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("modal_")
      ) {
        const type = interaction.customId.slice("modal_".length);

        if (!REQUEST_TYPES[type]) {
          return interaction.reply({
            content: "❌ Type de demande inconnu.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const remaining = getSubmissionCooldownRemaining(
          interaction.user.id,
          type
        );

        if (remaining > 0) {
          return interaction.reply({
            content: `⏳ Merci d'attendre ${Math.ceil(
              remaining / 1000
            )} seconde(s) avant de renvoyer cette demande.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const requestChannel = await getRequestChannel();

        if (!requestChannel || !requestChannel.isTextBased()) {
          return interaction.reply({
            content:
              "❌ Le canal de traitement est introuvable ou inaccessible.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const reviewerRole = getReviewerRoleId(type);

        await requestChannel.send({
          components: [buildStaffRequestComponent(interaction, type)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {
            roles: reviewerRole ? [reviewerRole] : [],
            users: [],
            parse: [],
          },
        });

        await interaction.reply({
          content:
            "✅ Votre dossier a été transmis au Bureau des Accréditations.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ========================================================
      // FORMULAIRE : REFUS D'UNE DEMANDE INITIALE
      // ========================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("reject_reason:")
      ) {
        const [, type, userId, messageId] =
          interaction.customId.split(":");

        if (
          !REQUEST_TYPES[type] ||
          !canProcessRequest(interaction.member, type)
        ) {
          return interaction.reply({
            content: "⛔ Accès refusé.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (requestLocks.has(messageId)) {
          return interaction.reply({
            content: "⏳ Ce dossier est déjà en cours de traitement.",
            flags: MessageFlags.Ephemeral,
          });
        }

        requestLocks.add(messageId);

        try {
          const requestChannel = await getRequestChannel();
          const message = await getFreshRequestMessage(messageId);

          if (!message) {
            return interaction.reply({
              content: "❌ Dossier introuvable.",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (getDossierPhase(message) !== "pending") {
            return interaction.reply({
              content: "⚠️ Ce dossier a déjà été traité.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const reason = getField(interaction, "reject_reason");
          const cleanReason =
            reason === "Non renseigné" ? "" : safeText(reason, 1000);
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

          const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);

          if (member) {
            await member
              .send({
                components: [
                  buildRejectDMComponent(
                    REQUEST_TYPES[type],
                    cleanReason,
                    type,
                    userId,
                    messageId
                  ),
                ],
                flags: MessageFlags.IsComponentsV2,
              })
              .catch(() => {});
          }

          await interaction.reply({
            content: "✅ Demande refusée et dossier mis à jour.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        } finally {
          requestLocks.delete(messageId);
        }
      }

      // ========================================================
      // FORMULAIRE : RÉPONSE DU BUREAU
      // ========================================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("contest_reply_modal:")
      ) {
        const [, userId, requestId] = interaction.customId.split(":");
        const key = buildContestKey(userId, requestId);
        const record = contestState.records[key];

        if (
          !record ||
          record.status !== "open" ||
          !canUseBureauMessaging(interaction.member) ||
          !canProcessRequest(interaction.member, record.type)
        ) {
          return interaction.reply({
            content: "⛔ Ce réexamen n'est pas accessible.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (contestLocks.has(key)) {
          return interaction.reply({
            content: "⏳ Une décision est en cours sur ce réexamen.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const reply = safeText(
          getField(interaction, "reply_message"),
          1500
        );

        const user = await client.users.fetch(userId).catch(() => null);
        const thread = await fetchRecordedThread(record);

        if (!user || !thread || thread.locked) {
          return interaction.reply({
            content: "❌ Impossible de transmettre la réponse.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (thread.archived) {
          await thread.setArchived(false).catch(() => {});
        }

        await user.send({
          components: [
            buildSystemNotice(
              "💬 RÉPONSE DU BUREAU",
              reply,
              COLORS.CMO_BLUE
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        await thread.send({
          components: [
            buildOutgoingContestComponent(reply, interaction.user),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {
            parse: [],
          },
        });

        await interaction.reply({
          content: "✅ Réponse transmise au demandeur.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }
    } catch (error) {
      console.error("[INTERACTION] Erreur :", error);

      const payload = {
        content:
          "❌ Une erreur interne est survenue. Vérifiez la console du bot.",
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
);

// ============================================================
// DÉMARRAGE
// ============================================================

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[READY] Connecté en tant que ${readyClient.user.tag}.`);

  await auditRequestChannelSecurity().catch((error) => {
    console.error("[SÉCURITÉ] Audit impossible :", error);
  });

  await updateGmodStatus();

  setInterval(updateGmodStatus, 30_000);
});

(async () => {
  try {
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("[STARTUP] Démarrage impossible :", error);
    process.exitCode = 1;
  }
})();

async function updateGmodStatus() {
  try {
    const server = await GameDig.query({
      type: "garrysmod",
      host: process.env.GMOD_HOST,
      port: Number(process.env.GMOD_PORT || 27015),
    });

    client.user.setPresence({
      activities: [
        {
          name: `🌐 CMO • ${server.numplayers} joueurs en ligne`,
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });
  } catch (error) {
    client.user.setPresence({
      activities: [
        {
          name: "🌐 CMO • Serveur hors ligne",
          type: ActivityType.Watching,
        },
      ],
      status: "dnd",
    });

    console.error("[GMOD] Serveur inaccessible :", error.message);
  }
}
