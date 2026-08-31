const {COLORS, EMOJI_IDS, STAFF_ROLE_ID, HC_STAFF_ROLE_ID} = require("../config");
const { request } = require("./factory");
const { GROUPS } = require("./groups");
const { MAJOR_REQUESTS } = require("./major");
const { RANK_REQUESTS } = require("./ranks");
const { SPECIALIZATION_REQUESTS } = require("./specializations");

const REQUESTS = {
  ...MAJOR_REQUESTS,
  ...RANK_REQUESTS,
  ...SPECIALIZATION_REQUESTS,
  staff: request({
    key: "staff",
    label: "Rôle Staff",
    code: "CLEARANCE // STAFF",
    group: "other",
    category: "staff",
    emoji: {id: EMOJI_IDS.staff},
    accentColor: COLORS.STAFF_RED,
    targetRoleId: STAFF_ROLE_ID,
    grantRoleIds: [STAFF_ROLE_ID],
    requiredConfigIds: [STAFF_ROLE_ID],
    reviewerRoleId: HC_STAFF_ROLE_ID || STAFF_ROLE_ID,
    formType: "staff",
  }),

  autre: request({
    key: "autre",
    label: "Demande particulière",
    code: "ROUTE // MANUAL REVIEW",
    group: "other",
    category: "manual",
    emoji: { id: EMOJI_IDS.other},
    accentColor: COLORS.OTHER_YELLOW,
    targetRoleId: null,
    grantRoleIds: [],
    requiredConfigIds: [],
    formType: "manual",
  }),
};

function getRequest(key) {
  return REQUESTS[key] || null;
}

function getGroupRequests(groupKey) {
  return Object.values(REQUESTS).filter(
    (item) => item.group === groupKey && item.enabled
  );
}

function logDisabledRequests() {
  for (const item of Object.values(REQUESTS)) {
    if (item.key === "autre" || item.enabled) continue;
    console.warn(
      `[CONFIG] Demande désactivée (IDs de rôles incomplets) : ${item.label}`
    );
  }
}

module.exports = {
  GROUPS,
  REQUESTS,
  getRequest,
  getGroupRequests,
  logDisabledRequests,
};
