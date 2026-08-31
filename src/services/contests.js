const { MessageFlags } = require("discord.js");
const { contestState, saveContestState, deleteContestRecord } = require("../state");
const { contestCreationLocks } = require("../locks");
const { buildContestKey, formatDateTimeFR, safeText } = require("../helpers");
const {
  getRequestChannel,
  fetchRecordedThread,
} = require("./discord");
const {
  buildContestThreadName,
  buildContestHeaderComponent,
} = require("../ui/contests");
const { inferInitialDecisionFromMessage } = require("../ui/requests");

function getInitialDecision(userId, requestId, message = null) {
  const key = buildContestKey(userId, requestId);
  const saved = contestState.initialDecisions[key];
  if (saved) return saved;
  if (!message) return null;

  const inferred = inferInitialDecisionFromMessage(message);
  if (inferred) {
    contestState.initialDecisions[key] = inferred;
    saveContestState();
  }
  return inferred;
}

function resetStaleClosedContest(userId, requestId) {
  const key = buildContestKey(userId, requestId);
  const existing = contestState.records[key];
  if (!existing || existing.status === "open") return false;
  deleteContestRecord(userId, requestId);
  console.log(`[CONTESTATIONS] Record fermé obsolète réinitialisé : ${key}`);
  return true;
}

async function getOrCreateContestThread({ client, user, request, requestId }) {
  const key = buildContestKey(user.id, requestId);
  const activeKey = contestState.activeByUser[user.id];

  if (activeKey && activeKey !== key) {
    const activeRecord = contestState.records[activeKey];
    if (activeRecord?.status === "open") {
      const activeThread = await fetchRecordedThread(client, activeRecord);
      if (activeThread && !activeThread.locked) {
        return {
          key,
          thread: activeThread,
          record: activeRecord,
          conflict: true,
          closed: false,
          busy: false,
          created: false,
        };
      }
      activeRecord.status = "closed";
      delete contestState.activeByUser[user.id];
      saveContestState();
    }
  }

  const existing = contestState.records[key];
  if (existing) {
    if (existing.status !== "open") {
      return { key, record: existing, closed: true, conflict: false, busy: false, created: false, thread: null };
    }

    const thread = await fetchRecordedThread(client, existing);
    if (thread && !thread.locked) {
      if (thread.archived) await thread.setArchived(false).catch(() => {});
      contestState.activeByUser[user.id] = key;
      saveContestState();
      return { key, record: existing, thread, closed: false, conflict: false, busy: false, created: false };
    }

    existing.status = "closed";
    if (contestState.activeByUser[user.id] === key) {
      delete contestState.activeByUser[user.id];
    }
    saveContestState();
    return { key, record: existing, closed: true, conflict: false, busy: false, created: false, thread: null };
  }

  if (contestCreationLocks.has(key)) {
    return { key, record: null, closed: false, conflict: false, busy: true, created: false, thread: null };
  }

  contestCreationLocks.add(key);
  try {
    const requestChannel = await getRequestChannel(client);
    if (!requestChannel?.threads) {
      throw new Error("Création de fil impossible.");
    }

    const thread = await requestChannel.threads.create({
      name: buildContestThreadName(user, request, requestId),
      autoArchiveDuration: 1440,
      reason: `Réexamen ${request.label} — ${safeText(user.username, 80)}`,
    });

    const record = {
      threadId: thread.id,
      userId: user.id,
      type: request.key,
      requestId,
      status: "open",
      openedAt: formatDateTimeFR(),
    };

    contestState.records[key] = record;
    contestState.activeByUser[user.id] = key;
    saveContestState();

    await thread.send({
      components: [buildContestHeaderComponent(user, request, requestId)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    return { key, record, thread, closed: false, conflict: false, busy: false, created: true };
  } finally {
    contestCreationLocks.delete(key);
  }
}

module.exports = {
  getInitialDecision,
  resetStaleClosedContest,
  getOrCreateContestThread,
};
