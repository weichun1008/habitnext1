// World Switch — per-world completion scoping. Pure, no Prisma import.
//
// The three gamification worlds (home / figure / journey) all attribute a
// completion to a world via TaskHistory.world, with one shared rule:
//   某世界完成數 = count(world IS NULL) + count(world = '該世界')
// i.e. pre-pick completions (world = null = 共同序章 / prologue) are a
// shared starting base every world inherits; only post-pick completions
// attribute to the world active at completion time.
//
// This module is the SINGLE source of that formula so home/figure/journey
// aggregation never each reinvent (and drift on) the prologue semantics.

const VALID_WORLDS = ['home', 'figure', 'journey'];

// Prisma `where` fragment selecting a world's completions (prologue + that
// world). Spread into a larger where, e.g.:
//   prisma.taskHistory.findMany({ where: {
//     completed: true,
//     task: { userId },
//     ...worldScopedWhere('home'),
//   }})
function worldScopedWhere(worldKey) {
  return { OR: [{ world: null }, { world: worldKey }] };
}

// In-memory equivalent for already-fetched rows (e.g. unit tests, or when a
// caller already has the history list). A row belongs to `worldKey` when its
// world is null (prologue) or equals the key.
function belongsToWorld(row, worldKey) {
  if (!row) return false;
  return row.world == null || row.world === worldKey;
}

// Count rows attributed to a world (prologue + that world).
function worldScopedCount(rows, worldKey) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((n, r) => (belongsToWorld(r, worldKey) ? n + 1 : n), 0);
}

// Normalise an activeWorld value to something safe to persist: a valid key
// or null (unpicked / prologue). Anything else → null.
function normalizeWorld(value) {
  return VALID_WORLDS.includes(value) ? value : null;
}

module.exports = {
  VALID_WORLDS,
  worldScopedWhere,
  belongsToWorld,
  worldScopedCount,
  normalizeWorld,
};
