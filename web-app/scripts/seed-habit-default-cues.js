// scripts/seed-habit-default-cues.js
// 批次填入官方習慣的「預設錨點」(OfficialHabit.defaultCue)。
// 值必須是 lib/anchors.js 的 LIFE_MOMENTS label。名稱明確對得上時機的才填，
// 整天累積 / 週期性 / 情境觸發 / 一次性的習慣刻意留空（不在 map 內 = 不動）。
// 可重跑（idempotent，依 name 比對）。Usage: node scripts/seed-habit-default-cues.js
require('./lib/env');
const { PrismaClient } = require('@prisma/client');

// LIFE_MOMENTS 的合法 label（與 src/lib/anchors.js 同步；注意全形斜線「／」）
const VALID = new Set([
  '起床後', '喝完第一杯水後', '刷完牙後', '洗完臉後', '吃完早餐後', '出門前', '到辦公室／工作場所後',
  '午餐前', '午餐後', '午間休息時',
  '下班離開工作場所後', '回家進門後', '晚餐前', '晚餐後', '洗完澡後', '上床睡覺前', '睡前躺上床後', '關燈前',
  '開電腦／開始工作前', '手機第一次解鎖時', '泡咖啡／泡茶時', '結束一個會議後', '完成一項任務後', '站起來伸展時',
  '通勤路上', '等公車／捷運時', '等紅綠燈時',
  '排隊／等候時', '打開社群媒體前', '感到壓力時',
]);

const MAP = {
  // 基因與腸道
  '觀察並記錄每日排便狀況': '起床後',
  '餐前喝一杯溫水': '晚餐前',
  // 壓力與睡眠
  '練習 4-7-8 呼吸法紓壓': '感到壓力時',
  '找一個 5 分鐘什麼都不做的時間': '午間休息時',
  '午後不再攝取咖啡因': '午餐後',
  '建立固定的睡前儀式': '上床睡覺前',
  '泡熱水澡放鬆神經': '晚餐後',
  '使用眼罩或耳塞助眠': '上床睡覺前',
  '睡前做 2 分鐘深呼吸（4-7-8）': '睡前躺上床後',
  '睡前補充鎂': '上床睡覺前',
  '睡前 1 小時不看手機 (藍光)': '上床睡覺前',
  '午間小睡 20 分鐘 (Power Nap)': '午餐後',
  '早上起床曬 10 分鐘太陽': '起床後',
  '寫下煩惱清單 (清空大腦)': '上床睡覺前',
  // 心靈
  '每日循環呼吸法10次': '起床後',
  '練習自我慈悲與對話': '感到壓力時',
  '閱讀心靈成長書籍': '上床睡覺前',
  '每日正念冥想 10 分鐘': '起床後',
  '寫下感恩日記 (三件事)': '上床睡覺前',
  '進行十分鐘的靜默練習': '午間休息時',
  '每天對著鏡子自我肯定': '刷完牙後',
  // 環境
  '臥室保持完全黑暗 (助眠)': '關燈前',
  '整理工作桌面保持清爽': '開電腦／開始工作前',
  '每天早晨開窗通風': '起床後',
  // 社交互動
  '與家人共進晚餐且不滑手機': '晚餐前',
  '每天擁抱家人/伴侶': '回家進門後',
  // 職涯與平衡
  '尋找工作中的心流體驗': '開電腦／開始工作前',
  '番茄鐘工作法': '開電腦／開始工作前',
  '設定每日最重要的三件事': '開電腦／開始工作前',
  '整理收件匣 (Inbox Zero)': '下班離開工作場所後',
  '劃分清晰的工作/生活界線': '下班離開工作場所後',
  // 認知與智慧
  '玩益智遊戲活化大腦': '通勤路上',
  '進行深度工作 (Deep Work)': '開電腦／開始工作前',
  '每天閱讀非虛構書籍 15 分鐘': '上床睡覺前',
  '觀看一場 TED Talk': '午間休息時',
  '收聽知識型 Podcast': '通勤路上',
  '寫作或輸出今日所學': '上床睡覺前',
  '每天學習一個新單字': '通勤路上',
  // 運動
  '晨間脊椎伸展操': '起床後',
  '進行 1 分鐘棒式 (Plank)': '起床後',
  '每天深蹲 30 下 (肌力)': '刷完牙後',
  '睡前拉筋放鬆肌肉': '上床睡覺前',
  '避免久坐超過 60 分鐘': '站起來伸展時',
  '飯後散步 15 分鐘 (穩定血糖)': '晚餐後',
  '上完廁所後伸展 10 分鐘': '站起來伸展時',
  '練習單腳站立 (平衡感)': '刷完牙後',
  '走樓梯代替搭電梯': '通勤路上',
  // 飲食
  '每餐攝取一個拳頭的蔬菜': '晚餐前',
  '吃飯細嚼慢嚥 (每口20下)': '晚餐前',
  '第一餐吃完後吃保健品': '吃完早餐後',
  '起床後喝兩大口水': '起床後',
  '避免晚餐後進食 (消夜)': '晚餐後',
  '每餐前先喝一杯水': '晚餐前',
  '維持血糖穩定 (先吃菜肉再吃飯)': '晚餐前',
  '空腹吃益生菌': '起床後',
  '每餐都要有一份蛋白質': '晚餐前',
  '飯後補充薑黃和葉酸鐵': '晚餐後',
};

async function main() {
  // 驗證所有 cue 值合法
  const bad = Object.entries(MAP).filter(([, cue]) => !VALID.has(cue));
  if (bad.length) { console.error('✗ 非法 cue（不在 LIFE_MOMENTS）：', bad); process.exit(1); }

  const prisma = new PrismaClient();
  let updated = 0, notFound = 0;
  for (const [name, cue] of Object.entries(MAP)) {
    const r = await prisma.officialHabit.updateMany({ where: { name }, data: { defaultCue: cue } });
    if (r.count > 0) { updated += r.count; }
    else { notFound++; console.warn('✗ 找不到習慣：', name); }
  }
  const total = await prisma.officialHabit.count();
  const filled = await prisma.officialHabit.count({ where: { NOT: { defaultCue: null } } });
  console.log(`\nDone. 指定 ${Object.keys(MAP).length} 個、更新 ${updated}、找不到 ${notFound}。`);
  console.log(`目前 ${filled}/${total} 個習慣已有預設錨點（其餘刻意留空：整天/情境/週期性）。`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
