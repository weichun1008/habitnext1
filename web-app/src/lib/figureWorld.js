// 公仔世界成長模型：把完成次數映射成公仔生長階段。純函式，閾值集中於頂部。
// 鏡像 journeyWorld.cityTier / nextTierProgress 的風格。
const STAGES = [
  { stage: 1, name: '蛋',     min: 0 },
  { stage: 2, name: '幼體',   min: 5 },
  { stage: 3, name: '成長期', min: 15 },
  { stage: 4, name: '活潑期', min: 35 },
  { stage: 5, name: '成熟期', min: 70 },
  { stage: 6, name: '夥伴',   min: 120 },
];

function figureStage(count) {
  let s = STAGES[0];
  for (const row of STAGES) if (count >= row.min) s = row;
  return s;
}

function nextStageProgress(count) {
  const cur = figureStage(count);
  const idx = STAGES.findIndex((row) => row.stage === cur.stage);
  const next = STAGES[idx + 1];
  if (!next) return { stage: cur.stage, name: cur.name, nextName: null, remaining: 0 };
  return { stage: cur.stage, name: cur.name, nextName: next.name, remaining: next.min - count };
}

module.exports = { STAGES, figureStage, nextStageProgress };
