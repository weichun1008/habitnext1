// src/lib/musicTool.js
// Resolves a sleep-music selection into a track list and a human-readable label.
// Resolution priority: explicit trackId > categoryId > problemId (via its
// recommendedCategoryId) > everything. Lists are stable-sorted so that tracks
// with a real audioUrl (the only ones that actually play) surface first.

const { PROBLEMS, CATEGORIES, TRACKS } = require('./musicData');

function playableFirst(list) {
  // Stable sort: audioUrl tracks before the rest, original order preserved within each group.
  return list
    .map((track, index) => ({ track, index }))
    .sort((a, b) => {
      const aPlayable = a.track.audioUrl ? 0 : 1;
      const bPlayable = b.track.audioUrl ? 0 : 1;
      if (aPlayable !== bPlayable) return aPlayable - bPlayable;
      return a.index - b.index;
    })
    .map((entry) => entry.track);
}

function resolveTracks(config = {}) {
  const { trackId, categoryId, problemId } = config;

  if (trackId) {
    return TRACKS.filter((t) => t.id === trackId);
  }

  let targetCategoryId = categoryId;
  if (!targetCategoryId && problemId) {
    const problem = PROBLEMS.find((p) => p.id === problemId);
    if (problem) targetCategoryId = problem.recommendedCategoryId;
  }

  const list = targetCategoryId
    ? TRACKS.filter((t) => t.categoryId === targetCategoryId)
    : TRACKS.slice();

  return playableFirst(list);
}

function playableTracks(list = []) {
  return list.filter((t) => t && t.audioUrl);
}

function describeMusic(config = {}) {
  const { problemId, categoryId, trackId, timerMin } = config;
  const parts = [];

  if (problemId) {
    const problem = PROBLEMS.find((p) => p.id === problemId);
    if (problem) parts.push(problem.title);
  } else if (categoryId) {
    const category = CATEGORIES.find((c) => c.id === categoryId);
    if (category) parts.push(category.title);
  } else if (trackId) {
    const track = TRACKS.find((t) => t.id === trackId);
    if (track) parts.push(track.title);
  }

  if (timerMin != null) {
    parts.push(`${timerMin} 分鐘`);
  }

  return parts.join('・');
}

module.exports = { resolveTracks, playableTracks, describeMusic };
