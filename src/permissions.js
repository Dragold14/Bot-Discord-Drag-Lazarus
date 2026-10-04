const { PermissionFlagsBits } = require("discord.js");
const {
  STAFF_ROLE_ID,
  HC_STAFF_ROLE_ID,
  AFFECTATION_ROLE_ID,
} = require("./config");

function isAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}

function hasRole(member, roleId) {
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

// Staff + Superviseur d'Affectation (Directorat). Les Officiers d'Affectation
// n'en font volontairement pas partie : ce sont de simples joueurs habilités.
function isAnyStaff(member) {
  if (!member) return false;
  return (
    isAdmin(member) ||
    hasRole(member, STAFF_ROLE_ID) ||
    hasRole(member, HC_STAFF_ROLE_ID)
  );
}

function isSupervisor(member) {
  return isAdmin(member) || hasRole(member, HC_STAFF_ROLE_ID);
}

// Retourne null si le membre peut traiter la demande, sinon le message de refus.
//  - Administrateur : toujours.
//  - Superviseur d'Affectation (HC_STAFF_ROLE_ID) : toutes les demandes.
//  - Rôle valideur de la demande (Officier d'Affectation en général).
//  - Personne ne traite sa propre demande (sauf administrateur).
function getProcessDenial(member, request, targetUserId = null) {
  if (!member || !request) return "⛔ Accès refusé.";
  if (isAdmin(member)) return null;

  const allowed =
    hasRole(member, HC_STAFF_ROLE_ID) ||
    hasRole(member, request.reviewerRoleId);
  if (!allowed) return "⛔ Accès refusé.";

  if (targetUserId && member.id === targetUserId) {
    return "⛔ Vous ne pouvez pas traiter votre propre demande.";
  }
  return null;
}

function canProcessRequest(member, request, targetUserId = null) {
  return getProcessDenial(member, request, targetUserId) === null;
}

function canUseBureauMessaging(member) {
  return isAnyStaff(member) || hasRole(member, AFFECTATION_ROLE_ID);
}

module.exports = {
  isAnyStaff,
  isSupervisor,
  getProcessDenial,
  canProcessRequest,
  canUseBureauMessaging,
};
