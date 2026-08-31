const fs = require("fs");
const {
  STATE_FILE,
  STATE_BACKUP_FILE,
} = require("./config");

const contestState = {
  records: {},
  activeByUser: {},
  initialDecisions: {},
};

function normalize(parsed = {}) {
  return {
    records:
      parsed.records && typeof parsed.records === "object" ? parsed.records : {},
    activeByUser:
      parsed.activeByUser && typeof parsed.activeByUser === "object"
        ? parsed.activeByUser
        : {},
    initialDecisions:
      parsed.initialDecisions && typeof parsed.initialDecisions === "object"
        ? parsed.initialDecisions
        : {},
  };
}

function loadContestState() {
  for (const file of [STATE_FILE, STATE_BACKUP_FILE]) {
    try {
      if (!fs.existsSync(file)) continue;
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      const normalized = normalize(parsed);
      contestState.records = normalized.records;
      contestState.activeByUser = normalized.activeByUser;
      contestState.initialDecisions = normalized.initialDecisions;

      console.log(
        file === STATE_FILE
          ? "[CONTESTATIONS] État chargé."
          : "[CONTESTATIONS] Sauvegarde de secours chargée."
      );

      if (file === STATE_BACKUP_FILE) {
        try {
          fs.copyFileSync(STATE_BACKUP_FILE, STATE_FILE);
        } catch (error) {
          console.error("[CONTESTATIONS] Restauration impossible :", error);
        }
      }
      return;
    } catch (error) {
      console.error(`[CONTESTATIONS] Lecture impossible (${file}) :`, error);
    }
  }
}

function saveContestState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.copyFileSync(STATE_FILE, STATE_BACKUP_FILE);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(contestState, null, 2), "utf8");
  } catch (error) {
    console.error("[CONTESTATIONS] Sauvegarde impossible :", error);
    throw error;
  }
}

function deleteContestRecord(userId, requestId) {
  const key = `${userId}:${requestId}`;
  delete contestState.records[key];
  if (contestState.activeByUser[userId] === key) {
    delete contestState.activeByUser[userId];
  }
  saveContestState();
}

loadContestState();

module.exports = {
  contestState,
  saveContestState,
  deleteContestRecord,
};
