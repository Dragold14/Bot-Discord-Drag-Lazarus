const { STAFF_ROLE_ID } = require("../config");

const compact = (values) => [...new Set(values.filter(Boolean))];

function request(definition) {
  // Les valeurs null de requiredConfigIds sont conservées : elles servent à
  // masquer une option tant que tous ses IDs obligatoires ne sont pas remplis.
  const requiredConfigIds = definition.requiredConfigIds || [];
  return {
    reviewerRoleId: STAFF_ROLE_ID,
    grantRoleIds: [],
    removeRoleIds: [],
    requireAllRoleIds: [],
    ...definition,
    requiredConfigIds,
    enabled: requiredConfigIds.every(Boolean),
  };
}

module.exports = { compact, request };
