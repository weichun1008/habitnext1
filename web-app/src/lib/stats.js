// src/lib/stats.js
// Pure aggregation for the Slice I stats page.
// No Prisma, no I/O — takes plain rows, returns a stats bundle.
// See spec: docs/superpowers/specs/2026-05-21-slice-i-stats-streak-design.md

const HEATMAP_DAYS = 84;       // 12 weeks
const WINDOW_30 = 30;
const WINDOW_7 = 7;
const TOP_TASK_STREAKS = 5;

// ---- date helpers (string-only, no TZ surprises) -----------------------------

function parseISO(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatISO(ms) {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, n) {
  return formatISO(parseISO(dateStr) + n * 86400000);
}

function diffDays(a, b) {
  return Math.round((parseISO(a) - parseISO(b)) / 86400000);
}

// ---- private aggregators -----------------------------------------------------

// Set of dates where at least one task was completed
function completedDateSet(history) {
  const s = new Set();
  for (const row of history) {
    if (row.completed) s.add(row.date);
  }
  return s;
}

// Current streak: walk from today backwards. Today blank does NOT break (grace).
// Yesterday blank = break. completedDates is a Set<string>.
function currentStreakFromToday(completedDates, todayStr) {
  let streak = 0;
  let cursor = todayStr;
  const todayDone = completedDates.has(todayStr);

  if (todayDone) {
    streak = 1;
    cursor = addDays(todayStr, -1);
  } else {
    // grace: skip today, start counting from yesterday
    cursor = addDays(todayStr, -1);
  }

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Longest consecutive run in the set, anywhere in history
function longestStreak(completedDates) {
  if (completedDates.size === 0) return 0;
  const sorted = Array.from(completedDates).sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i], sorted[i - 1]) === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function computeOverall(history, todayStr) {
  const dates = completedDateSet(history);
  return {
    currentStreak: currentStreakFromToday(dates, todayStr),
    longestStreak: longestStreak(dates),
    todayCompleted: dates.has(todayStr),
  };
}

function computeCompletionRate(history, tasks, todayStr) {
  const rate = (windowDays) => {
    const earliest = addDays(todayStr, -(windowDays - 1));
    const inWindow = history.filter(r => r.date >= earliest && r.date <= todayStr);
    if (inWindow.length === 0) return 0;
    // Active proxy: any task with at least one history row in window.
    const activeTaskIds = new Set(inWindow.map(r => r.taskId));
    const denom = activeTaskIds.size * windowDays;
    const numer = inWindow.filter(r => r.completed).length;
    return denom === 0 ? 0 : numer / denom;
  };
  return {
    last7: rate(WINDOW_7),
    last30: rate(WINDOW_30),
  };
}

function computeDomainBreakdown(history, tasks, categories, todayStr) {
  const earliest = addDays(todayStr, -(WINDOW_30 - 1));
  const taskCategory = new Map(tasks.map(t => [t.id, t.category]));

  const counts = new Map();
  for (const row of history) {
    if (!row.completed) continue;
    if (row.date < earliest || row.date > todayStr) continue;
    const cat = taskCategory.get(row.taskId);
    if (!cat) continue;  // orphan
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }

  // Only include categories that actually have an entry in `categories`.
  // Order by HabitCategory.order asc.
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(cat => ({
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      order: cat.order,
      count: counts.get(cat.name) || 0,
    }))
    .filter(d => d.count > 0);
}

function computeHeatmap(history, todayStr) {
  const counts = new Map();
  for (const row of history) {
    if (row.completed) {
      counts.set(row.date, (counts.get(row.date) || 0) + 1);
    }
  }
  const out = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const date = addDays(todayStr, -i);
    out.push({ date, count: counts.get(date) || 0 });
  }
  return out;
}

function computeTopTaskStreaks(history, tasks, todayStr) {
  const perTask = new Map();
  for (const row of history) {
    if (!perTask.has(row.taskId)) perTask.set(row.taskId, new Set());
    if (row.completed) perTask.get(row.taskId).add(row.date);
  }

  const results = [];
  for (const task of tasks) {
    const dates = perTask.get(task.id) || new Set();
    const cur = currentStreakFromToday(dates, todayStr);
    const lon = longestStreak(dates);
    if (cur === 0 && lon === 0) continue;
    results.push({
      taskId: task.id,
      title: task.title,
      identity: task.identity || null,
      currentStreak: cur,
      longestStreak: lon,
    });
  }

  results.sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
    return a.title.localeCompare(b.title);
  });

  return results.slice(0, TOP_TASK_STREAKS);
}

// ---- public API --------------------------------------------------------------

function computeStats(history, tasks, categories, todayStr) {
  return {
    overall: computeOverall(history, todayStr),
    completionRate: computeCompletionRate(history, tasks, todayStr),
    domainBreakdown: computeDomainBreakdown(history, tasks, categories, todayStr),
    heatmap: computeHeatmap(history, todayStr),
    topTaskStreaks: computeTopTaskStreaks(history, tasks, todayStr),
  };
}

module.exports = {
  computeStats,
  // exported for unit testing / API route convenience
  addDays,
  HEATMAP_DAYS,
};
