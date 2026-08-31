const { ROLE_IDS } = require("../config");
const { REQUESTS } = require("../catalog");

const RANKS = {
  phys: [
    [ROLE_IDS.ranks.phys.mdr, "Militaire du Rang - PHYS"],
    [ROLE_IDS.ranks.phys.sousOfficier, "Sous-Officier - PHYS"],
    [ROLE_IDS.ranks.phys.officier, "Officier - PHYS"],
    [ROLE_IDS.ranks.phys.coGerant, "Co-Gérant - PHYS"],
    [ROLE_IDS.ranks.phys.gerant, "Gérant - PHYS"],
  ],
  ptol: [
    [ROLE_IDS.ranks.ptol.mdr, "Militaire du Rang - PTOL"],
    [ROLE_IDS.ranks.ptol.sousOfficier, "Sous-Officier - PTOL"],
    [ROLE_IDS.ranks.ptol.officier, "Officier - PTOL"],
    [ROLE_IDS.ranks.ptol.coGerant, "Co-Gérant - PTOL"],
    [ROLE_IDS.ranks.ptol.gerant, "Gérant - PTOL"],
  ],
};

function getCurrentRank(member, branch) {
  const ladder = RANKS[branch] || [];
  for (const [roleId, label] of [...ladder].reverse()) {
    if (roleId && member.roles.cache.has(roleId)) {
      return { roleId, label };
    }
  }
  return null;
}

function getMemberBranches(member) {
  const branches = [];
  if (ROLE_IDS.major.physique && member.roles.cache.has(ROLE_IDS.major.physique)) {
    branches.push("phys");
  }
  if (ROLE_IDS.major.ptolemee && member.roles.cache.has(ROLE_IDS.major.ptolemee)) {
    branches.push("ptol");
  }
  return branches;
}

function getMemberContext(member, request) {
  const currentRank = request.branch
    ? getCurrentRank(member, request.branch)
    : null;

  return {
    currentRankRoleId: currentRank?.roleId || null,
    currentRankLabel: currentRank?.label || null,
    hasPhysique: Boolean(
      ROLE_IDS.major.physique && member.roles.cache.has(ROLE_IDS.major.physique)
    ),
    hasPtolemee: Boolean(
      ROLE_IDS.major.ptolemee && member.roles.cache.has(ROLE_IDS.major.ptolemee)
    ),
  };
}

function validateRequestEligibility(member, request) {
  if (!request?.enabled && request?.key !== "autre") {
    return {
      ok: false,
      message:
        "⚠️ Cette demande n'est pas encore configurée par l'administration.",
    };
  }

  if (request.targetRoleId && member.roles.cache.has(request.targetRoleId)) {
    return {
      ok: false,
      message: `⚠️ Vous possédez déjà **${request.label}**.`,
    };
  }

  for (const roleId of request.requireAllRoleIds || []) {
    if (!member.roles.cache.has(roleId)) {
      const role = member.guild.roles.cache.get(roleId);
      return {
        ok: false,
        message: `⛔ Prérequis manquant : **${role?.name || "rôle requis"}**.`,
      };
    }
  }

  if (request.requiredCurrentRankRoleId) {
    const currentRank = getCurrentRank(member, request.branch);
    if (currentRank?.roleId !== request.requiredCurrentRankRoleId) {
      return {
        ok: false,
        message: `⛔ Vous devez être **${request.requiredCurrentRankLabel}** pour demander **${request.label}**.`,
      };
    }
  }

  return { ok: true, context: getMemberContext(member, request) };
}

function getAvailableBranchRequests(member, branch) {
  return Object.values(REQUESTS)
    .filter((request) => request.branch === branch)
    .filter((request) =>
      request.category === "rank" || request.category === "specialization"
    )
    .filter((request) => validateRequestEligibility(member, request).ok)
    .sort((a, b) => {
      if (a.category !== b.category) return a.category === "rank" ? -1 : 1;
      return a.label.localeCompare(b.label, "fr");
    });
}

function resolveManageableRoles(guild, roleIds, action) {
  const roles = [];
  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      throw new Error(`Rôle introuvable (${roleId}) pendant ${action}.`);
    }
    if (!role.editable) {
      throw new Error(
        `Le bot ne peut pas gérer le rôle « ${role.name} ». Placez son rôle Discord au-dessus.`
      );
    }
    roles.push(role);
  }
  return roles;
}

async function applyRequestRoles(member, request, reason = "Accréditation CMO") {
  const grantIds = [...new Set((request.grantRoleIds || []).filter(Boolean))];
  const protectedIds = new Set(grantIds);
  const removeIds = [...new Set((request.removeRoleIds || []).filter(Boolean))]
    .filter((id) => !protectedIds.has(id))
    .filter((id) => member.roles.cache.has(id));
  const addIds = grantIds.filter((id) => !member.roles.cache.has(id));

  resolveManageableRoles(member.guild, removeIds, "le retrait");
  resolveManageableRoles(member.guild, addIds, "l'attribution");

  const transaction = { added: [], removed: [] };

  try {
    if (removeIds.length) {
      await member.roles.remove(removeIds, reason);
      transaction.removed.push(...removeIds);
    }
    if (addIds.length) {
      await member.roles.add(addIds, reason);
      transaction.added.push(...addIds);
    }
    return transaction;
  } catch (error) {
    await rollbackRequestRoles(member, transaction, `${reason} — rollback`).catch(
      () => {}
    );
    throw error;
  }
}

async function rollbackRequestRoles(member, transaction, reason = "Rollback CMO") {
  if (transaction.added?.length) {
    await member.roles.remove(transaction.added, reason).catch(() => {});
  }
  if (transaction.removed?.length) {
    await member.roles.add(transaction.removed, reason).catch(() => {});
  }
}

module.exports = {
  getCurrentRank,
  getMemberBranches,
  getMemberContext,
  getAvailableBranchRequests,
  validateRequestEligibility,
  applyRequestRoles,
  rollbackRequestRoles,
};
