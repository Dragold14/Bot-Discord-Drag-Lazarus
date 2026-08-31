function getRequestFields(request, context = {}) {
  // ============================================================
  // HAUT COMMANDEMENT
  // ============================================================

  if (request.formType === "hc") {
    return [
      {
        id: "nom_prenom",
        label: "Prénom / Nom",
        placeholder: "Ex : [Simon Riley]",
      },
      {
        id: "matricule",
        label: "Matricule",
        placeholder: "Ex : [0000]",
      },
      {
        id: "nom_code",
        label: "Nom de code (facultatif)",
        placeholder: 'Ex : ["Ghost"]',
        required: false,
      },
      {
        id: "justification",
        label: "Justification",
        placeholder: "Précisez le contexte de votre demande...",
        style: "paragraph",
        maxLength: 1200,
      },
    ];
  }

  // ============================================================
  // STAFF
  // ============================================================

  if (request.formType === "staff") {
    return [
      {
        id: "nom_prenom",
        label: "Prénom / Nom",
        placeholder: "Ex : [Simon Riley]",
      },
      {
        id: "matricule",
        label: "Matricule",
        placeholder: "Ex : [0000]",
      },
      {
        id: "nom_code",
        label: "Nom de code (facultatif)",
        placeholder: 'Ex : ["Ghost"]',
        required: false,
      },
      {
        id: "motivation",
        label: "Motivation / expérience",
        placeholder: "Expliquez pourquoi vous souhaitez rejoindre le Staff...",
        style: "paragraph",
        maxLength: 1200,
      },
    ];
  }

  // ============================================================
  // PROMOTION DE GRADE
  // ============================================================
  // Le matricule n'est PAS redemandé ici.

  if (request.formType === "rank") {
    const current =
      context.currentRankLabel ||
      "grade actuel détecté par le bot";

    return [
      {
        id: "date_grade",
        label: "Date d'obtention du grade actuel",
        placeholder: "Ex : [21/08/2026]",
      },
      {
        id: "justification",
        label: "Motivation / justification",
        placeholder: `${current} → ${request.label}`,
        style: "paragraph",
        maxLength: 1200,
      },
    ];
  }

  // ============================================================
  // SPÉCIALISATION
  // ============================================================
  // Le matricule n'est PAS redemandé ici.

  if (request.formType === "specialization") {
    return [
      {
        id: "date_formation",
        label: "Date de la formation",
        placeholder: "Ex : [21/08/2026]",
      },
      {
        id: "formateur",
        label: "Formateur / responsable (facultatif)",
        placeholder: 'Ex : [Simon Riley] / ["Ghost"]',
        required: false,
      },
      {
        id: "justification",
        label: "Informations complémentaires",
        placeholder: "Précisez votre qualification ou les éléments utiles...",
        style: "paragraph",
        required: false,
        maxLength: 1000,
      },
    ];
  }

  // ============================================================
  // DEMANDE MANUELLE / PARTICULIÈRE
  // ============================================================

  if (request.formType === "manual") {
    return [
      {
        id: "nom_prenom",
        label: "Prénom / Nom",
        placeholder: "Ex : [Simon Riley]",
      },
      {
        id: "matricule",
        label: "Matricule",
        placeholder: "Ex : [0000]",
      },
      {
        id: "nom_code",
        label: "Nom de code (facultatif)",
        placeholder: 'Ex : ["Ghost"]',
        required: false,
      },
      {
        id: "explication",
        label: "Expliquez votre demande",
        placeholder: "Décrivez précisément votre demande...",
        style: "paragraph",
        maxLength: 1000,
      },
    ];
  }

  // ============================================================
  // ACCRÉDITATION INITIALE / FORMULAIRE STANDARD
  // ============================================================

  return [
    {
      id: "nom_prenom",
      label: "Prénom / Nom",
      placeholder: "Ex : [Simon Riley]",
    },
    {
      id: "matricule",
      label: "Matricule",
      placeholder: "Ex : [0000]",
    },
    {
      id: "nom_code",
      label: "Nom de code (facultatif)",
      placeholder: 'Ex : ["Ghost"]',
      required: false,
    },
    {
      id: "date_formation",
      label: "Date de la formation",
      placeholder: "Ex : [21/08/2026]",
    },
  ];
}

module.exports = {
  getRequestFields,
};