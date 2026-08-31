const { COLORS } = require("../config");

const GROUPS = {
  major: {
    title: "🛡️ // ACCRÉDITATIONS MAJEURES",
    description:
      "Choisissez votre branche opérationnelle principale. Une fois validée, elle déverrouille votre parcours de branche.",
    placeholder: "Sélectionner une branche principale…",
    accentColor: COLORS.CMO_BLUE,
  },

  other: {
    title: "🔹 // AUTRES ACCRÉDITATIONS",
    description:
      "Demandes hors parcours PHYS / PTOL : Recherche & Développement, Haut Commandement, rôle Staff et demande particulière.",
    placeholder: "Sélectionner une autre demande…",
    accentColor: COLORS.OTHER_YELLOW,
  },

  // Conservés pour compatibilité interne avec le catalogue. Ils ne sont plus
  // publiés directement dans le panneau principal : le parcours est généré
  // en privé selon les rôles du joueur.
  rank_phys: {
    title: "🔵 // ÉVOLUTION DE GRADE — PHYSIQUE",
    description: "Évolution de grade de la Division Physique.",
    placeholder: "Sélectionner un grade PHYS…",
    accentColor: COLORS.PHYS_BLUE,
  },
  rank_ptol: {
    title: "🟢 // ÉVOLUTION DE GRADE — PTOLÉMÉE",
    description: "Évolution de grade de la Division Ptolémée.",
    placeholder: "Sélectionner un grade PTOL…",
    accentColor: COLORS.PTOLEMEE_GREEN,
  },
  spec_phys: {
    title: "🔷 // SPÉCIALISATIONS — PHYSIQUE",
    description: "Qualifications opérationnelles de la Division Physique.",
    placeholder: "Sélectionner une spécialisation PHYS…",
    accentColor: COLORS.PHYS_BLUE,
  },
  spec_ptol: {
    title: "🟩 // SPÉCIALISATIONS — PTOLÉMÉE",
    description: "Qualifications opérateur de la Division Ptolémée.",
    placeholder: "Sélectionner une spécialisation PTOL…",
    accentColor: COLORS.PTOLEMEE_GREEN,
  },
};

module.exports = { GROUPS };
