# Slice A.5 — 推薦習慣資料庫 Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed 90 GENESIS+IO recommended habits (9 categories × 10) into the OfficialHabit table with full 3-tier difficulty configs, so the explore Modal has real content after Slice A's UI work.

**Architecture:** One-shot JSON generation by Claude (using Gemini ref's 9×10 sub-goal names), user reviews in editor, then idempotent upsert-by-name seed script (same pattern as Slice A's `seed-genesis-io.js`). Single schema delta: `@unique` on `OfficialHabit.name`.

**Tech Stack:** Prisma 5 + Vercel Postgres, Node CommonJS scripts, no new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-18-slice-a5-recommended-habits-seed-design.md`](../specs/2026-05-18-slice-a5-recommended-habits-seed-design.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/prisma/seed/genesis-io-habits.json` | 90 OfficialHabit records with `difficulties` JSON |
| `web-app/scripts/seed-genesis-io-habits.js` | Idempotent upsert by name |
| `docs/superpowers/notes/2026-05-18-habit-seed-review.md` | Review summary tables, one per domain |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | `OfficialHabit.name` → `String @unique` |

---

## Task 1: Schema — `@unique` on `OfficialHabit.name`

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: Pre-flight audit — no duplicate names in existing data**

Run from `web-app/`:
```bash
set -a; source .env.local; set +a
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.officialHabit.groupBy({by:['name'],_count:{_all:true}}).then(r=>{const dupes=r.filter(x=>x._count._all>1); console.log('total:',r.length,'dupes:',dupes.length); if(dupes.length) dupes.forEach(d=>console.log(d.name, d._count._all)); return p.\$disconnect();})"
```

Expected: `total: 3 dupes: 0`. If `dupes > 0`, STOP — you must rename or delete duplicates before adding `@unique`. The 3 current names are unique per Slice A audit but verify anyway.

- [ ] **Step 2: Update schema**

In `web-app/prisma/schema.prisma`, locate `model OfficialHabit { ... }` and change the `name` line from:

```prisma
  name        String   // 習慣集合名稱，如「每日喝水」
```

to:

```prisma
  name        String   @unique  // 習慣集合名稱，如「每日喝水」（unique for idempotent seed upsert）
```

- [ ] **Step 3: Push schema to DB**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push
```

Expected output ending with `Your database is now in sync with your Prisma schema.` No data-loss prompt (adding a unique index on a column with no duplicate values is safe).

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx prisma generate
```

Expected: `Generated Prisma Client ...`.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): unique OfficialHabit.name for idempotent seed"
```

---

## Task 2: Generate seed JSON (90 records)

**Files:**
- Create: `web-app/prisma/seed/genesis-io-habits.json`

**This task is content-heavy.** The implementer must read the source list, then produce 90 OfficialHabit records by applying the rules below. Output is a single JSON array.

- [ ] **Step 1: Read the 90 source names**

Read `C:\Users\user\Documents\ai test\habit_explore_v1_bygemini.txt`, lines 124-296 (the `CATEGORIES` const). Each category object has a `subGoals` array of 10 Chinese strings. Extract:

| `id` (Gemini ref) | `zh` (= seed category) | 10 subGoals |
|---|---|---|
| `gene_gut` | `基因與腸道` | 每日攝取益生菌/發酵食物、觀察並記錄每日排便狀況、避免攝取過敏原食物、定期進行健康檢查、記錄家族病史風險、每天攝取足夠膳食纖維、餐前喝一杯溫水、避免不必要的抗生素使用、練習腹式呼吸按摩腸道、攝取富含益生元的食物 (洋蔥/蒜) |
| `environment` | `環境` | 每天早晨開窗通風、整理工作桌面保持清爽、接觸大自然/戶外散步、減少暴露於噪音環境、每週進行數位環境大掃除、臥室保持完全黑暗 (助眠)、種植室內植物淨化空氣、調整符合人體工學的桌椅、定期清理冰箱與儲藏室、減少使用一次性塑膠 |
| `nutrition` | `飲食` | 執行 168 間歇性斷食、每餐攝取一個拳頭的蔬菜、減少精緻糖與澱粉攝取、吃飯細嚼慢嚥 (每口20下)、維持血糖穩定 (先吃菜肉再吃飯)、每天喝足 2500cc 水、每週實行一日無肉日、避免晚餐後進食 (消夜)、攝取優質 Omega-3 油脂、閱讀食品營養標示 |
| `exercise` | `運動` | 飯後散步 15 分鐘 (穩定血糖)、每天深蹲 30 下 (肌力)、避免久坐超過 60 分鐘、每週進行 3 次有氧運動、晨間脊椎伸展操、走樓梯代替搭電梯、進行 1 分鐘棒式 (Plank)、睡前拉筋放鬆肌肉、每天步行 8000 步、練習單腳站立 (平衡感) |
| `stress_sleep` | `壓力與睡眠` | 睡前 1 小時不看手機 (藍光)、練習 4-7-8 呼吸法紓壓、確保每天 7 小時優質睡眠、建立固定的睡前儀式、午後不再攝取咖啡因、泡熱水澡放鬆神經、使用眼罩或耳塞助眠、寫下煩惱清單 (清空大腦)、早上起床曬 10 分鐘太陽、午間小睡 20 分鐘 (Power Nap) |
| `interpersonal` | `社交互動` | 每天擁抱家人/伴侶、每週與一位好友通話、練習傾聽不打斷、主動表達感謝與愛、參與社群活動減少孤獨感、安排與伴侶的約會時光、每天讚美一個人、寫張卡片給重要的人、練習換位思考、與家人共進晚餐且不滑手機 |
| `spirit_mind` | `心靈` | 每日正念冥想 10 分鐘、寫下感恩日記 (三件事)、定義個人核心價值觀、練習自我慈悲與對話、尋找生活中的意義感 (Ikigai)、閱讀心靈成長書籍、進行十分鐘的靜默練習、練習寬恕與放下、每天對著鏡子自我肯定、參與藝術創作或欣賞 |
| `intellectual` | `認知與智慧` | 每天閱讀非虛構書籍 15 分鐘、學習一項新技能或語言、玩益智遊戲活化大腦、進行深度工作 (Deep Work)、寫作或輸出今日所學、收聽知識型 Podcast、每天學習一個新單字、觀看一場 TED Talk、練習批判性思考、參加線上課程或講座 |
| `occupational` | `職涯與平衡` | 設定每日最重要的三件事、劃分清晰的工作/生活界線、定期檢視職涯成就感、優化工作流程提升效率、尋找工作中的心流體驗、整理收件匣 (Inbox Zero)、番茄鐘工作法、拒絕不必要的會議、每週回顧工作進度、建立個人品牌 |

If reading the txt file is blocked or content drifts, use this table verbatim — it's been captured from the spec.

- [ ] **Step 2: Apply the generation rules per habit**

For **each of the 90 source names**, produce one OfficialHabit record:

```json
{
  "name": "<source string verbatim>",
  "description": "<1-2 sentences explaining behavior science or health rationale, zh-TW, neutral tone>",
  "category": "<one of the 9 standard category names>",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "<binary|quantitative|checklist>", "dailyTarget": <int>, "unit": "<unit string>", "stepValue": <int>, "subtasks": [], "recurrence": <recurrence object> },
    "intermediate": { "enabled": true, "label": "進階", "type": "...", ... },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "...", ... }
  }
}
```

**Type-selection rules** (apply per habit):
- Quantitative (`type: "quantitative"`) — when a measurable target makes sense: 水量 (cc), 步數, 分鐘, 次數, 蔬菜分量
- Binary (`type: "binary"`) — when "did it / didn't" is what matters: 開窗、寫日記、擁抱家人
- Checklist (`type: "checklist"`) — when multi-step routine: 晨間脊椎伸展操、建立固定的睡前儀式
- **Default**: when in doubt, use `binary`

**Difficulty escalation rules** (apply per habit type):

| Type | beginner | intermediate | challenge |
|---|---|---|---|
| binary | weekly, weekDays=[1,3,5], periodTarget=3, weekMode=flexible | weekly, weekDays=[1,2,3,4,5], periodTarget=5 | daily, interval=1, periodTarget=1 |
| quantitative | daily, dailyTarget=低值 | daily, dailyTarget=中值 | daily, dailyTarget=高值 |
| checklist | daily, subtasks=[](留空) | daily, subtasks=[] | daily, subtasks=[] |

**Concrete examples** (use these as patterns):

```json
// Example 1: binary habit
{
  "name": "每日攝取益生菌/發酵食物",
  "description": "益生菌維持腸道菌相平衡，發酵食物含活性菌與短鏈脂肪酸，幫助免疫與消化。",
  "category": "基因與腸道",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "binary", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
}

// Example 2: quantitative habit
{
  "name": "每天喝足 2500cc 水",
  "description": "水分攝取影響代謝、皮膚與認知；分次少量補水比一次大量更有效。",
  "category": "飲食",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "quantitative", "dailyTarget": 1500, "unit": "cc", "stepValue": 250, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "quantitative", "dailyTarget": 2000, "unit": "cc", "stepValue": 250, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "quantitative", "dailyTarget": 2500, "unit": "cc", "stepValue": 250, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
}

// Example 3: checklist habit (subtasks left empty per spec; user fills if desired)
{
  "name": "建立固定的睡前儀式",
  "description": "規律睡前活動傳達「準備休息」訊號給神經系統，加速入睡與深層睡眠。",
  "category": "壓力與睡眠",
  "icon": null,
  "isActive": true,
  "difficulties": {
    "beginner":     { "enabled": true, "label": "入門", "type": "checklist", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,3,5], "weekMode": "flexible", "periodTarget": 3 } },
    "intermediate": { "enabled": true, "label": "進階", "type": "checklist", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "weekly", "interval": 1, "endType": "never", "weekDays": [1,2,3,4,5], "weekMode": "flexible", "periodTarget": 5 } },
    "challenge":    { "enabled": true, "label": "挑戰", "type": "checklist", "dailyTarget": 1, "unit": "次", "stepValue": 1, "subtasks": [], "recurrence": { "type": "daily", "interval": 1, "endType": "never", "periodTarget": 1 } }
  }
}
```

- [ ] **Step 3: Write the JSON file**

Write all 90 records as a JSON array to `web-app/prisma/seed/genesis-io-habits.json`. Format with **2-space indentation, UTF-8 (no BOM)**. Maintain category order matching `genesis-io.json` (基因與腸道 → 環境 → 飲食 → 運動 → 壓力與睡眠 → 社交互動 → 心靈 → 認知與智慧 → 職涯與平衡), 10 habits per category in the source-list order.

- [ ] **Step 4: Validate**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
const h = JSON.parse(require('fs').readFileSync('prisma/seed/genesis-io-habits.json','utf-8'));
console.log('records:', h.length);
const byCat = {};
for (const x of h) byCat[x.category] = (byCat[x.category]||0)+1;
Object.entries(byCat).forEach(([k,v])=>console.log(' ', k, v));
const names = h.map(x=>x.name);
const dupes = names.filter((n,i)=>names.indexOf(n)!==i);
if (dupes.length) { console.log('DUPLICATES:', dupes); process.exit(1); }
const standardCats = new Set(['基因與腸道','環境','飲食','運動','壓力與睡眠','社交互動','心靈','認知與智慧','職涯與平衡']);
const badCats = h.filter(x=>!standardCats.has(x.category));
if (badCats.length) { console.log('BAD CATEGORY:', badCats.map(x=>x.name+':'+x.category)); process.exit(1); }
const noDiff = h.filter(x=>!x.difficulties?.beginner?.enabled || !x.difficulties?.intermediate?.enabled || !x.difficulties?.challenge?.enabled);
if (noDiff.length) { console.log('MISSING DIFFICULTIES:', noDiff.map(x=>x.name)); process.exit(1); }
console.log('OK');
"
```

Expected output:
```
records: 90
  基因與腸道 10
  環境 10
  飲食 10
  運動 10
  壓力與睡眠 10
  社交互動 10
  心靈 10
  認知與智慧 10
  職涯與平衡 10
OK
```

If anything other than `OK` is printed, fix the JSON and re-validate.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/seed/genesis-io-habits.json && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "chore(seed): scaffold 90 GENESIS+IO recommended habits"
```

---

## Task 3: Generate review markdown

**Files:**
- Create: `docs/superpowers/notes/2026-05-18-habit-seed-review.md`

This is a one-page summary the user scans to spot anomalies before seed runs against the DB.

- [ ] **Step 1: Read the seed JSON**

Read `web-app/prisma/seed/genesis-io-habits.json` (just written in Task 2).

- [ ] **Step 2: Build a per-domain markdown table**

For each of the 9 standard categories, produce a section like this:

```markdown
## 基因與腸道（10 個）

| name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|
| 每日攝取益生菌/發酵食物 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 餐前喝一杯溫水 | binary | 週3 | 週5 | 每日 | 也可改 quantitative (杯) |
...
```

**Column rules:**
- `name`: copy `record.name`
- `type`: copy `record.difficulties.beginner.type`
- `beginner` / `intermediate` / `challenge`: render as human-readable summary:
  - For `quantitative`: `<dailyTarget><unit>/<頻率簡寫>` — e.g. `2000cc/日`
  - For `binary`: `<頻率描述>` — e.g. `週3 (一三五)`, `每日`
  - For `checklist`: `週3 (空)`, `每日 (空)` — flag empty subtasks
- `note`: any of these signals deserve a note (you decide; user reads):
  - Type choice that could plausibly go the other way
  - `subtasks` empty when checklist (always add note: "subtasks 待補")
  - Dailtarget jump that feels too aggressive (e.g. 1500 → 3000)

Header: top of file `# Habit Seed Review (Slice A.5)` + a paragraph explaining how to use the doc (e.g., "open `prisma/seed/genesis-io-habits.json` alongside this and edit; then re-run validate").

- [ ] **Step 3: Write the file**

Save to `docs/superpowers/notes/2026-05-18-habit-seed-review.md`. UTF-8, no BOM.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add docs/superpowers/notes/ && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "docs(notes): habit seed review summary for Slice A.5"
```

---

## ⏸️ CHECKPOINT — User review

After Task 3 completes, **PAUSE**. The controller should:

1. Tell the user: "Seed JSON + review summary committed. Open `web-app/prisma/seed/genesis-io-habits.json` in editor, scan `docs/superpowers/notes/2026-05-18-habit-seed-review.md` for anomalies, edit JSON as needed, then say 'go' to proceed to seed."

2. Wait for user's "go" / approval signal.

3. If user committed edits during review, the controller acknowledges and moves to Task 4.

**Do not auto-proceed past this checkpoint.** Task 4 modifies prod DB.

---

## Task 4: Seed script

**Files:**
- Create: `web-app/scripts/seed-genesis-io-habits.js`

- [ ] **Step 1: Implement the script**

```js
// scripts/seed-genesis-io-habits.js
// Idempotently upserts the 90 GENESIS+IO recommended habits.
// Usage: node scripts/seed-genesis-io-habits.js (run from web-app/)

require('./lib/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const dataPath = path.join(__dirname, '..', 'prisma', 'seed', 'genesis-io-habits.json');
  const habits = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const beforeCount = await prisma.officialHabit.count();
  console.log(`Before: ${beforeCount} habits in DB`);

  let created = 0;
  let updated = 0;
  for (const h of habits) {
    const existing = await prisma.officialHabit.findUnique({ where: { name: h.name } });
    await prisma.officialHabit.upsert({
      where: { name: h.name },
      update: {
        description: h.description ?? null,
        category: h.category,
        icon: h.icon ?? null,
        difficulties: h.difficulties,
        isActive: h.isActive ?? true,
      },
      create: {
        name: h.name,
        description: h.description ?? null,
        category: h.category,
        icon: h.icon ?? null,
        difficulties: h.difficulties,
        isActive: h.isActive ?? true,
      },
    });
    if (existing) updated++; else created++;
  }

  const afterCount = await prisma.officialHabit.count();
  console.log(`Seeded GENESIS+IO habits: created=${created}, updated=${updated}`);
  console.log(`After: ${afterCount} habits in DB`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: First run**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected output:
```
Before: 3 habits in DB
Seeded GENESIS+IO habits: created=90, updated=0
After: 93 habits in DB
```

(If the seed JSON contained any name that collides with the 3 existing habits, `created` will be <90 and `updated` will be >0. Capture actual numbers in report.)

- [ ] **Step 3: Second run — verify idempotency**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-genesis-io-habits.js
```

Expected:
```
Before: 93 habits in DB
Seeded GENESIS+IO habits: created=0, updated=90
After: 93 habits in DB
```

- [ ] **Step 4: Audit final state**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/audit-categories.js
```

Expected: 9 standard categories listed, each with ≥10 habits (the 3 existing ones land in `飲食`, `運動`, `心靈`, so those show 11).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/scripts/seed-genesis-io-habits.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(scripts): seed 90 GENESIS+IO recommended habits"
```

---

## Task 5: API smoke test

This validates `/api/habits` now returns 93 habits and all 9 categories have content.

- [ ] **Step 1: Start dev server (if not already running)**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npm run dev
```

Run in background; wait for `Ready in Xs`.

- [ ] **Step 2: Hit the endpoint**

```bash
curl -s http://localhost:3000/api/habits | node -e "
let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
  const j = JSON.parse(d);
  console.log('total habits:', j.habits.length);
  const byCat = {};
  for (const h of j.habits) byCat[h.category] = (byCat[h.category]||0)+1;
  Object.entries(byCat).forEach(([k,v])=>console.log(' ',k,v));
});"
```

Expected: `total habits: 93`, each of the 9 standard categories listed with count ≥ 10 (three of them = 11).

If any category is missing or count is wrong, the seed file or migration has drift — STOP, investigate, fix, re-seed.

- [ ] **Step 3: No commit needed**

This is verification only.

---

## Task 6: Browser verification

Manual smoke through the live UI on local dev server.

- [ ] **Step 1: Open the app preview**

Use the preview tool's `Habitnext Dev` launch config (already configured in `.claude/launch.json` from Slice A).

- [ ] **Step 2: Log in**

Either use an existing seeded test user or recreate one via direct DB insert with bcrypt-hashed password. (Use the same recipe as Slice A Task 14: insert user with `bcrypt.hash('SliceAtest', 10)` and `phone: '0900000001'`; delete after verification.)

- [ ] **Step 3: Open the explore Modal**

Click the new "探索習慣" button in the desktop sidebar (or the green `+` in mobile header). Confirm:

- 9 domain cards visible
- Click any domain — habit list shows ≥ 10 habits
- Each habit has 3 difficulty pills (入門 / 進階 / 挑戰), all selectable
- Click "新增" — TaskFormModal opens with prefilled values matching the chosen difficulty
- Cancel; verify search across views works (`水` should match multiple habits across categories)

- [ ] **Step 4: Spot-check a checklist habit**

Pick one of the habits you tagged `checklist` in the review md (e.g. 「建立固定的睡前儀式」). Verify the modal does NOT crash on empty `subtasks` array.

- [ ] **Step 5: Stop dev server, clean up test user**

Stop preview server. Delete the throwaway test user via:
```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
require('./scripts/lib/env');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.delete({ where: { phone: '0900000001' } }).then(u => console.log('deleted', u.id)).catch(e => console.error(e.message)).finally(() => p.\$disconnect());
"
```

(Skip this cleanup if you reused an existing user.)

- [ ] **Step 6: No commit needed**

Manual verification only.

---

## Task 7: Merge + push

- [ ] **Step 1: Check branch state**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git status --short && git log --oneline main..HEAD
```

Should show clean working tree and the new commits from Tasks 1-4 on `feat/slice-a5-recommended-habits-seed`.

- [ ] **Step 2: Switch to main and fast-forward merge**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-a5-recommended-habits-seed
```

Expected: `Fast-forward` output listing all new commits.

- [ ] **Step 3: Push**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git push origin main
```

Expected: push succeeds; Vercel automatically triggers a production deployment.

- [ ] **Step 4: Wait for Vercel build**

Verify via:
```bash
vercel --scope johnson-cofitmes-projects ls habitnext1 2>&1 | head -4
```

Wait until status reads `● Ready`.

- [ ] **Step 5: Live smoke**

Reload https://habitnext1.vercel.app, log in (real user), open 探索習慣, confirm each domain has habits. No commit.

---

## Self-Review Notes

- Spec section 2 (Non-goals): respected — no AI flow, no admin batch tool, no Lucide icon migration, no i18n, no ranking
- Spec section 3 (Schema): Task 1
- Spec section 4 (Source: 90 sub-goals): Task 2 Step 1 embeds the full table
- Spec section 5 (Generation rules): Task 2 Step 2 codifies all rules + concrete examples
- Spec section 6 (Files): Tasks 1, 2, 3, 4 cover all 4 file changes
- Spec section 7 (Phases): mapped onto Tasks 1-7 with explicit checkpoint
- Spec section 8 (Seed script): Task 4 Step 1 contains the script verbatim
- Spec section 9 (Acceptance): Tasks 4, 5, 6 verify each criterion
- Spec section 10 (Risks): Task 1 Step 1 pre-flight audit, Task 2 Step 4 validation, Task 4 idempotency verify all addressed
- No placeholders. No "TBD". All commands have expected output.
- Type names consistent: `OfficialHabit`, `difficulties.beginner/intermediate/challenge`, `recurrence.type`, etc. align across tasks.
