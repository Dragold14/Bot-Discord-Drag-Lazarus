const {
  COLORS,
  ROLE_IDS,
  EMOJI_IDS,
  STAFF_ROLE_ID,
  HC_STAFF_ROLE_ID,
} = require("../config");

const { compact, request } = require("./factory");

const MAJOR_REQUESTS = {
  // Les anciennes clés sont conservées pour les contestations existantes.
  physique: request({
    key: "physique",
    label: "Fantassin",
    code: "DIVISION // PHYSIQUE",
    group: "major",
    category: "major",
    branch: "phys",
    emoji: {id: EMOJI_IDS.phys},
    accentColor: COLORS.PHYS_BLUE,
    targetRoleId: ROLE_IDS.major.physique,
    grantRoleIds: compact([
      ROLE_IDS.separators.rankPhys,
      ROLE_IDS.ranks.phys.mdr,
      ROLE_IDS.separators.divisionPhys,
      ROLE_IDS.major.physique,
      ROLE_IDS.separators.specPhys,
    ]),
    requiredConfigIds: [
      ROLE_IDS.major.physique,
      ROLE_IDS.ranks.phys.mdr,
      ROLE_IDS.separators.rankPhys,
      ROLE_IDS.separators.divisionPhys,
      ROLE_IDS.separators.specPhys,
    ],
    formType: "major",
  }),

  ptolemee: request({
    key: "ptolemee",
    label: "Partisan",
    code: "DIVISION // PTOLÉMÉE",
    group: "major",
    category: "major",
    branch: "ptol",
    emoji: {id: EMOJI_IDS.ptol},
    accentColor: COLORS.PTOLEMEE_GREEN,
    targetRoleId: ROLE_IDS.major.ptolemee,
    grantRoleIds: compact([
      ROLE_IDS.separators.rankPtol,
      ROLE_IDS.ranks.ptol.mdr,
      ROLE_IDS.separators.divisionPtol,
      ROLE_IDS.major.ptolemee,
      ROLE_IDS.separators.specPtol,
    ]),
    requiredConfigIds: [
      ROLE_IDS.major.ptolemee,
      ROLE_IDS.ranks.ptol.mdr,
      ROLE_IDS.separators.rankPtol,
      ROLE_IDS.separators.divisionPtol,
      ROLE_IDS.separators.specPtol,
    ],
    formType: "major",
  }),

  rd: request({
    key: "rd",
    label: "Membre R&D",
    code: "DIVISION // R&D",
    group: "other",
    category: "major",
    emoji: "🧪",
    accentColor: COLORS.RD_DARK_GREEN,
    targetRoleId: ROLE_IDS.major.rd,
    grantRoleIds: compact([ROLE_IDS.separators.rd, ROLE_IDS.major.rd]),
    requiredConfigIds: [ROLE_IDS.major.rd],
    formType: "major",
  }),

  extra: request({
    key: "extra",
    label: "Personnel extra divisionnaire",
    code: "ROUTE // EXTRA-DIVISIONNAIRE",
    group: "legacy",
    category: "major",
    emoji: "🔹",
    accentColor: COLORS.OTHER_YELLOW,
    targetRoleId: ROLE_IDS.major.extra,
    grantRoleIds: compact([ROLE_IDS.separators.extra, ROLE_IDS.major.extra]),
    requiredConfigIds: [ROLE_IDS.major.extra],
    formType: "major",
  }),

  hc: request({
    key: "hc",
    label: "Membre Haut Commandement",
    code: "CLEARANCE // COMMAND",
    group: "other",
    category: "major",
    emoji: {id: EMOJI_IDS.highCommand},
    accentColor: COLORS.STAFF_RED,
    targetRoleId: ROLE_IDS.major.hc,
    grantRoleIds: compact([ROLE_IDS.separators.hc, ROLE_IDS.major.hc]),
    requiredConfigIds: [ROLE_IDS.major.hc],
    reviewerRoleId: HC_STAFF_ROLE_ID || STAFF_ROLE_ID,
    formType: "hc",
  }),
};

module.exports = { MAJOR_REQUESTS };
