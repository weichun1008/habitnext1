// src/lib/subtasks.js
// Pure helpers for the daily-recurring checklist subtask model.
//
// Subtask shape: { id, label, addedAt, removedAt? }
//   - addedAt    string YYYY-MM-DD — first date the subtask appears
//   - removedAt  optional string YYYY-MM-DD — first date it stops appearing
//
// A date D shows a subtask iff addedAt <= D && (!removedAt || D < removedAt).
// Missing addedAt is treated as always-added for legacy-data safety.

function visibleSubtasks(task, dateStr) {
  const arr = Array.isArray(task?.subtasks) ? task.subtasks : [];
  return arr.filter(s => {
    const addedOk = !s.addedAt || s.addedAt <= dateStr;
    const removedOk = !s.removedAt || dateStr < s.removedAt;
    return addedOk && removedOk;
  });
}

function computeChecklistValue(completions) {
  if (!completions || typeof completions !== 'object') return 0;
  let n = 0;
  for (const v of Object.values(completions)) {
    if (v === true) n++;
  }
  return n;
}

module.exports = { visibleSubtasks, computeChecklistValue };
