const requestLocks = new Set();
const contestLocks = new Set();
const contestCreationLocks = new Set();
const submissionCooldowns = new Map();

function getSubmissionCooldownRemaining(userId, requestKey, duration = 15000) {
  const key = `${userId}:${requestKey}`;
  const now = Date.now();
  const last = submissionCooldowns.get(key) || 0;
  const remaining = duration - (now - last);

  if (remaining > 0) return remaining;

  submissionCooldowns.set(key, now);
  setTimeout(() => {
    if (submissionCooldowns.get(key) === now) {
      submissionCooldowns.delete(key);
    }
  }, duration);

  return 0;
}

module.exports = {
  requestLocks,
  contestLocks,
  contestCreationLocks,
  getSubmissionCooldownRemaining,
};
