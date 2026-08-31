require("dotenv").config();

const fs = require("fs");
const path = require("path");

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

const DISCORD_TOKEN = env("DISCORD_TOKEN");
const CLIENT_ID = env("CLIENT_ID");
const GUILD_ID = env("GUILD_ID");
const REQUEST_CHANNEL_ID = env("REQUEST_CHANNEL_ID");
const STAFF_ROLE_ID = env("STAFF_ROLE_ID");
const HC_STAFF_ROLE_ID = env("HC_STAFF_ROLE_ID");

const requiredVariables = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  REQUEST_CHANNEL_ID,
  STAFF_ROLE_ID,
};

for (const [name, value] of Object.entries(requiredVariables)) {
  if (!value) {
    console.error(`[CONFIG] Variable manquante : ${name}`);
    process.exit(1);
  }
}

const COLORS = {
  CMO_BLUE: 0x1677d2,
  PHYS_BLUE: 0x1677d2,
  PTOLEMEE_GREEN: 0x3ba55d,
  RD_DARK_GREEN: 0x195c3a,
  STAFF_RED: 0xd32f2f,
  OTHER_YELLOW: 0xf0b232,
  SUCCESS: 0x2ea043,
};

const ROLE_IDS = {
  major: {
    // Compatibilité avec l'ancien .env : ROLE_PHYSIQUE_ID / ROLE_PTOLEMEE_ID.
    physique: env("ROLE_FANTASSIN_ID", "ROLE_PHYSIQUE_ID"),
    ptolemee: env("ROLE_PARTISAN_ID", "ROLE_PTOLEMEE_ID"),
    rd: env("ROLE_RD_ID"),
    extra: env("ROLE_EXTRA_ID"),
    hc: env("ROLE_HC_ID"),
  },

  separators: {
    rankPhys: env("ROLE_SEPARATOR_RANK_PHYS_ID"),
    rankPtol: env("ROLE_SEPARATOR_RANK_PTOL_ID"),
    divisionPhys: env("ROLE_SEPARATOR_DIV_PHYS_ID"),
    divisionPtol: env("ROLE_SEPARATOR_DIV_PTOL_ID"),
    specPhys: env("ROLE_SEPARATOR_SPEC_PHYS_ID"),
    specPtol: env("ROLE_SEPARATOR_SPEC_PTOL_ID"),
    rd: env("ROLE_SEPARATOR_RD_ID"),
    extra: env("ROLE_SEPARATOR_EXTRA_ID"),
    hc: env("ROLE_SEPARATOR_HC_ID"),
  },

  ranks: {
    phys: {
      mdr: env("ROLE_MDR_PHYS_ID"),
      sousOfficier: env("ROLE_SOUS_OFFICIER_PHYS_ID"),
      officier: env("ROLE_OFFICIER_PHYS_ID"),
      coGerant: env("ROLE_CO_GERANT_PHYS_ID"),
      gerant: env("ROLE_GERANT_PHYS_ID"),
    },
    ptol: {
      mdr: env("ROLE_MDR_PTOL_ID"),
      sousOfficier: env("ROLE_SOUS_OFFICIER_PTOL_ID"),
      officier: env("ROLE_OFFICIER_PTOL_ID"),
      coGerant: env("ROLE_CO_GERANT_PTOL_ID"),
      gerant: env("ROLE_GERANT_PTOL_ID"),
    },
  },

  specializations: {
    phys: {
      cqb: env("ROLE_CQB_ID"),
      appuiFeu: env("ROLE_APPUI_FEU_ID"),
      demolition: env("ROLE_DEMOLITION_ID"),
      tpTe: env("ROLE_TP_TE_ID"),
    },
    ptol: {
      medical: env("ROLE_MEDICAL_ID"),
      drone: env("ROLE_DRONE_ID"),
      motorise: env("ROLE_MOTORISE_ID"),
      genie: env("ROLE_GENIE_ID"),
      quartierMaitre: env("ROLE_QUARTIER_MAITRE_ID"),
    },
  },
};

const EMOJI_IDS = {
  cmoBlack: env("EMOJI_CMO_BLACK_ID"),
  cmoTransparent: env("EMOJI_CMO_TRANSPARENT_ID"),
  cmoWhite: env("EMOJI_CMO_WHITE_ID"),

  highCommand: env("EMOJI_HC_ID"),
  phys: env("EMOJI_PHYS_ID"),
  pm: env("EMOJI_PM_ID"),
  ptol: env("EMOJI_PTOL_ID"),
  rh: env("EMOJI_RH_ID"),

  other: env("EMOJI_OTHER_ID"),
  staff: env("EMOJI_STAFF_ID"),
};

// Sur Railway, le volume est utilisé. En local, on conserve le comportement
// historique : contestations.json reste dans la racine du projet.
const DATA_DIR = env("RAILWAY_VOLUME_MOUNT_PATH") || process.cwd();
fs.mkdirSync(DATA_DIR, { recursive: true });

const STATE_FILE = path.join(DATA_DIR, "contestations.json");
const STATE_BACKUP_FILE = path.join(DATA_DIR, "contestations.backup.json");

module.exports = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  REQUEST_CHANNEL_ID,
  STAFF_ROLE_ID,
  HC_STAFF_ROLE_ID,
  COLORS,
  ROLE_IDS,
  EMOJI_IDS,
  DATA_DIR,
  STATE_FILE,
  STATE_BACKUP_FILE,
};
