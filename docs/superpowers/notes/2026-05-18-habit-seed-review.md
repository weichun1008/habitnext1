# Habit Seed Review (Slice A.5)

This summary lets you scan 90 recommended habits before they hit prod DB. To edit, open `web-app/prisma/seed/genesis-io-habits.json` directly alongside this doc.

After editing, re-run the validate snippet from the Task 2 instructions, then say "go" to the controller to proceed to Task 4 (seed script + DB upsert).

**Important pre-flagged issues** (from quality review, address before seed):

1. **「確保每天 7 小時優質睡眠」** — beginner target is 6h but description says 7-9h is healthy. Internal contradiction. Suggest: bump beginner to 7.
2. **「定期進行健康檢查」** + **「記錄家族病史風險」** — annual/one-off actions mapped to weekly→daily cadence. Suggest: change recurrence to monthly, or rephrase habits.
3. **「每週實行一日無肉日」, 「每週與一位好友通話」, 「每週進行 3 次有氧運動」, 「每週進行數位環境大掃除」, 「每週回顧工作進度」** — names contain 「每週」 but their challenge tier resolves to daily. Suggest: keep all three tiers weekly, escalate periodTarget (e.g. 1→2→3).
4. **「進行 1 分鐘棒式 (Plank)」** — currently binary; could be quantitative seconds (20/45/60) for better progression. Editorial choice.
5. **「每天深蹲 30 下」, 「每天步行 8000 步」, 「每天喝足 2500cc 水」, 「執行 168 間歇性斷食」** — habit names encode a specific target that matches *challenge* tier, but beginner uses lower target. Cognitive dissonance. Suggest: drop the number from the name, OR accept that the name describes the challenge goal.
6. **「拒絕不必要的會議」, 「每天擁抱家人/伴侶」, 「安排與伴侶的約會時光」** — situational (requires meetings to refuse, family at home, partner). Soft concern for "推薦" defaults.
7. **「每天對著鏡子自我肯定」** — description states benefit as certain; affirmations have mixed evidence. Soft concern; user may want to soften.

---

## 基因與腸道（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 每日攝取益生菌/發酵食物 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 2 | 觀察並記錄每日排便狀況 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 避免攝取過敏原食物 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational |
| 4 | 定期進行健康檢查 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 年度行為，cadence 失真 |
| 5 | 記錄家族病史風險 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 一次性行為，cadence 失真 |
| 6 | 每天攝取足夠膳食纖維 | quantitative | 15g/日 | 25g/日 | 35g/日 | |
| 7 | 餐前喝一杯溫水 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 避免不必要的抗生素使用 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational |
| 9 | 練習腹式呼吸按摩腸道 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 10 | 攝取富含益生元的食物 (洋蔥/蒜) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |

## 環境（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 每天早晨開窗通風 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 2 | 整理工作桌面保持清爽 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 接觸大自然/戶外散步 | quantitative | 10分鐘/日 | 20分鐘/日 | 30分鐘/日 | |
| 4 | 減少暴露於噪音環境 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 5 | 每週進行數位環境大掃除 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 名稱含「每週」，但 challenge 為每日 |
| 6 | 臥室保持完全黑暗 (助眠) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 7 | 種植室內植物淨化空氣 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 調整符合人體工學的桌椅 | binary | 週3 (一三五) | 週5 (週間) | 每日 | one-off setup |
| 9 | 定期清理冰箱與儲藏室 | binary | 週3 (一三五) | 週5 (週間) | 每日 | cadence 偏高 |
| 10 | 減少使用一次性塑膠 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |

## 飲食（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 執行 168 間歇性斷食 | quantitative | 12小時/日 | 14小時/日 | 16小時/日 | ⚠️ 名稱寫死 168，beginner=12h 不符 |
| 2 | 每餐攝取一個拳頭的蔬菜 | quantitative | 1份/日 | 2份/日 | 3份/日 | |
| 3 | 減少精緻糖與澱粉攝取 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 4 | 吃飯細嚼慢嚥 (每口20下) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 5 | 維持血糖穩定 (先吃菜肉再吃飯) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 6 | 每天喝足 2500cc 水 | quantitative | 1500cc/日 | 2000cc/日 | 2500cc/日 | ⚠️ 名稱寫死 2500cc，beginner=1500cc 不符 |
| 7 | 每週實行一日無肉日 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 名稱含「每週」，但 challenge 為每日 |
| 8 | 避免晚餐後進食 (消夜) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 9 | 攝取優質 Omega-3 油脂 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 10 | 閱讀食品營養標示 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |

## 運動（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 飯後散步 15 分鐘 (穩定血糖) | quantitative | 5分鐘/日 | 10分鐘/日 | 15分鐘/日 | |
| 2 | 每天深蹲 30 下 (肌力) | quantitative | 15下/日 | 20下/日 | 30下/日 | ⚠️ 名稱寫死 30 下，beginner=15 不符 |
| 3 | 避免久坐超過 60 分鐘 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 4 | 每週進行 3 次有氧運動 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 名稱含「每週」，但 challenge 為每日 |
| 5 | 晨間脊椎伸展操 | checklist | 週3 (一三五) (空) | 週5 (週間) (空) | 每日 (空) | checklist 子任務為空 |
| 6 | 走樓梯代替搭電梯 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 7 | 進行 1 分鐘棒式 (Plank) | binary | 週3 (一三五) | 週5 (週間) | 每日 | 可改 quantitative 秒數 (20/45/60) |
| 8 | 睡前拉筋放鬆肌肉 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 9 | 每天步行 8000 步 | quantitative | 5000步/日 | 7000步/日 | 10000步/日 | ⚠️ 名稱寫死 8000 步，三階皆不符 |
| 10 | 練習單腳站立 (平衡感) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |

## 壓力與睡眠（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 睡前 1 小時不看手機 (藍光) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 2 | 練習 4-7-8 呼吸法紓壓 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 確保每天 7 小時優質睡眠 | quantitative | 6小時/日 | 7小時/日 | 8小時/日 | ⚠️ 描述稱 7-9h 健康，beginner=6h 矛盾，建議升至 7 |
| 4 | 建立固定的睡前儀式 | checklist | 週3 (一三五) (空) | 週5 (週間) (空) | 每日 (空) | checklist 子任務為空 |
| 5 | 午後不再攝取咖啡因 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 6 | 泡熱水澡放鬆神經 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 7 | 使用眼罩或耳塞助眠 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 寫下煩惱清單 (清空大腦) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 9 | 早上起床曬 10 分鐘太陽 | quantitative | 5分鐘/日 | 10分鐘/日 | 15分鐘/日 | |
| 10 | 午間小睡 20 分鐘 (Power Nap) | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational (上班族難每日) |

## 社交互動（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 每天擁抱家人/伴侶 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational (需家人/伴侶) |
| 2 | 每週與一位好友通話 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 名稱含「每週」，但 challenge 為每日 |
| 3 | 練習傾聽不打斷 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 4 | 主動表達感謝與愛 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 5 | 參與社群活動減少孤獨感 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 6 | 安排與伴侶的約會時光 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational (需伴侶；每日過頻) |
| 7 | 每天讚美一個人 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 寫張卡片給重要的人 | binary | 週3 (一三五) | 週5 (週間) | 每日 | cadence 過高 |
| 9 | 練習換位思考 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 10 | 與家人共進晚餐且不滑手機 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational (需家人同住) |

## 心靈（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 每日正念冥想 10 分鐘 | quantitative | 5分鐘/日 | 10分鐘/日 | 20分鐘/日 | |
| 2 | 寫下感恩日記 (三件事) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 定義個人核心價值觀 | binary | 週3 (一三五) | 週5 (週間) | 每日 | one-off reflection，cadence 失真 |
| 4 | 練習自我慈悲與對話 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 5 | 尋找生活中的意義感 (Ikigai) | binary | 週3 (一三五) | 週5 (週間) | 每日 | 抽象，難以每日勾選 |
| 6 | 閱讀心靈成長書籍 | quantitative | 10分鐘/日 | 20分鐘/日 | 30分鐘/日 | |
| 7 | 進行十分鐘的靜默練習 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 練習寬恕與放下 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 9 | 每天對著鏡子自我肯定 | binary | 週3 (一三五) | 週5 (週間) | 每日 | 描述語氣偏絕對，肯定式自言自語證據混雜 |
| 10 | 參與藝術創作或欣賞 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |

## 認知與智慧（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 每天閱讀非虛構書籍 15 分鐘 | quantitative | 10分鐘/日 | 15分鐘/日 | 30分鐘/日 | |
| 2 | 學習一項新技能或語言 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 玩益智遊戲活化大腦 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 4 | 進行深度工作 (Deep Work) | quantitative | 30分鐘/日 | 60分鐘/日 | 90分鐘/日 | |
| 5 | 寫作或輸出今日所學 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 6 | 收聽知識型 Podcast | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 7 | 每天學習一個新單字 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 8 | 觀看一場 TED Talk | binary | 週3 (一三五) | 週5 (週間) | 每日 | 每日過頻 (約 15 分鐘/支) |
| 9 | 練習批判性思考 | binary | 週3 (一三五) | 週5 (週間) | 每日 | 抽象 |
| 10 | 參加線上課程或講座 | binary | 週3 (一三五) | 週5 (週間) | 每日 | cadence 偏高 |

## 職涯與平衡（10 個）

| # | name | type | beginner | intermediate | challenge | note |
|---|---|---|---|---|---|---|
| 1 | 設定每日最重要的三件事 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 2 | 劃分清晰的工作/生活界線 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 3 | 定期檢視職涯成就感 | binary | 週3 (一三五) | 週5 (週間) | 每日 | cadence 偏高 |
| 4 | 優化工作流程提升效率 | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 5 | 尋找工作中的心流體驗 | binary | 週3 (一三五) | 週5 (週間) | 每日 | 抽象 |
| 6 | 整理收件匣 (Inbox Zero) | binary | 週3 (一三五) | 週5 (週間) | 每日 | |
| 7 | 番茄鐘工作法 | quantitative | 2次/日 | 4次/日 | 6次/日 | |
| 8 | 拒絕不必要的會議 | binary | 週3 (一三五) | 週5 (週間) | 每日 | situational (需有會議) |
| 9 | 每週回顧工作進度 | binary | 週3 (一三五) | 週5 (週間) | 每日 | ⚠️ 名稱含「每週」，但 challenge 為每日 |
| 10 | 建立個人品牌 | binary | 週3 (一三五) | 週5 (週間) | 每日 | 長期專案，難每日勾選 |
