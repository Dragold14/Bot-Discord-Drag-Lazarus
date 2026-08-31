const { PermissionFlagsBits } = require("discord.js");
const { STAFF_ROLE_ID, HC_STAFF_ROLE_ID } = require("./config");

function isAnyStaff(member) {
  if (!member) return false;
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.roles.cache.has(STAFF_ROLE_ID) ||
    Boolean(HC_STAFF_ROLE_ID && member.roles.cache.has(HC_STAFF_ROLE_ID))
  );
}

function canProcessRequest(member, request) {
  if (!member || !request) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return Boolean(
    request.reviewerRoleId && member.roles.cache.has(request.reviewerRoleId)
  );
}

function canUseBureauMessaging(member) {
  return isAnyStaff(member);
}

module.exports = {
  isAnyStaff,
  canProcessRequest,
  canUseBureauMessaging,
};
