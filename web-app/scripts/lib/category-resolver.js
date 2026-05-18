// scripts/lib/category-resolver.js

function resolveTargetCategory(currentCategory, mapping, stdNames) {
  const fallback = mapping._unmapped;
  if (!fallback) {
    throw new Error('category-migration.json must define a "_unmapped" fallback key');
  }
  if (!stdNames.has(fallback)) {
    throw new Error(`Fallback "${fallback}" is not a standard category. Run seed-genesis-io.js first or fix the mapping.`);
  }

  if (currentCategory in mapping && currentCategory !== '_unmapped' && currentCategory !== '_comment') {
    const target = mapping[currentCategory];
    if (!stdNames.has(target)) {
      throw new Error(`Mapping target "${target}" for "${currentCategory}" is not a standard category.`);
    }
    return target;
  }

  if (stdNames.has(currentCategory)) {
    return currentCategory;
  }

  return fallback;
}

module.exports = { resolveTargetCategory };
