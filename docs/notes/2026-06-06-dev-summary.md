# 開發總結 — 2026-06-06（各 session）

> 當日多個 session 在同一 repo 並行開發（git 身份統一為 HabitNext Dev、經 PR #18–#33 合併）。以下依**功能流**彙整，全部已合併 main 並由 Vercel 部署；當日結束時 79 套件 / 568 測試綠、build 成功。線上：https://habitnext1.vercel.app

---

## 流 A — 焦點地圖 + 嚮往 + 社群計畫（本 session）

- **焦點地圖流程重設計**：單頁拉桿 → 三階段引導（逐一評影響力 → 逐一評執行度 → 焦點地圖加入）。大拖鈕、選值不自動跳、可回上一步；**移除所有 BJ Fogg 字樣**、四象限改白話。加入時可選**養成期間**（21/66推薦/90/不設限 + 背後科學漸進揭露）。新增 `Task.targetDays`；啟用時依「執行度」自動套用起始難度（不再固定初級）；未勾選一律 keep_candidate（不再刪 skip）。
- **社群計畫（嚮往 → 可分享計畫）**：純演算法把一個嚮往的習慣集生成 Template v2.0（分階段：養成→進階→挑戰）。`Template` 加 `authorType / authorUserId / authorName / reviewStatus`、`expertId`(Template+Assignment) 放寬 nullable。送審制：申請公開 → 後台 `/admin/dashboard/templates/review` 核准 → 出現在探索計畫**獨立「社群計畫」分區**，標示「用戶自創 · by 作者」。
- **計畫家族可手動指定**：`Template.planFamilySlug` 覆寫；後台計畫卡可手動改家族，花朵/睡眠系統綁定者鎖定+提示洽超管/開發。
- **「存成計畫」入口修復 + 日記入口**：修好從嚮往進焦點地圖時保留 aspiration、完成畫面顯示「把這套存成計畫」(#32 日記嚮往群組也加同入口)。

## 流 B — 後台 API 伺服器端授權（本 session）

- `src/middleware.js` + `lib/adminAuth.js`（Web Crypto HMAC、httpOnly 簽章 cookie）保護**全部** `/api/admin/*`，非 admin → 401/403、fail-closed。登入種 cookie、登出清除。**新增必要環境變數 `ADMIN_SESSION_SECRET`**（已設於 Vercel）。**解決了原 HANDOFF §4 的 admin 權限 blocker**；使用者端 IDOR 仍待整合 cofit 會員系統。

## 流 C — 戒除/減低視覺 + 任務卡 UX（混合 session）

- **戒除/減低視覺區隔**（本 session）：左色帶 + 類型標籤（減低=琥珀 `TrendingDown`、戒除=玫紅 `Ban`）+ 淡底；戒除加「已守住 N 天」盾牌（`keptStreak`）。後續修：底色改不透明（修 swipe 層透出）。
- **隱藏未實作的「加地點/記錄這餐」**（本 session）：完成任務時不再冒出 Slice O/Q 兩個 chip（功能未完成、上傳 no-op），前端隱藏、元件保留。
- **任務卡控制**（另一 session）：星號/釘選置頂、桌機 ⋮ 選單位置調整與不被裁切(portal)、⋮ 移到完成圈左側不重疊、hover 顯示、undo toast 5s→3s、手動加入直接 active（不進候選）。
- **任務詳情**（另一 session）：暫停/隱藏/刪除收進右上 ⋮ 選單 + 編輯。

## 流 D — Slice T 習慣工具（另一 session）

- 虛擬工具：`TimerTool`（計時 + 番茄鐘）、`MusicTool`（睡眠音樂播放器，44 首 Suno 曲）、`BreathingTool`（4-7-8）；`ToolModal` 依 `toolType` 分派；`musicData` + `musicTool` resolver。
- 綁定：`OfficialHabit.fiveT`（`toolVirtual` / `toolPhysical`）；`seed-tools-5t` 依習慣名稱比對自動套；backfill 既有任務。
- 顯示：TaskCard「開始」鈕 + TaskDetailModal「開始」入口 + `PhysicalToolsList`（建議工具：名稱 + 可點連結，顯示於任務詳情）。GET tasks include `officialHabit.fiveT`。
- 後台：習慣工具編輯器（檢視/編輯 `fiveT`，含實體工具名稱+連結）、工具總覽頁（每個工具的 habits/task 使用量、點習慣 deep-link 到編輯器）。ToolModal 版面修正。

## 流 E — 文件（本 session）

- `HANDOFF.md` 補 §0.5 三大上線 + §4-1 改為「整合 cofit 會員系統」+ §3 標註加地點/記錄這餐已前端隱藏。
- `ARCHITECTURE.md` / `PRODUCT.md` 同步 0606 功能、修正過時敘述與路線圖。
- 新增 `docs/INDEX.md` 一頁式交接索引；`README.md` 開頭指向它。
- `docs/STRATEGY.md`（另一 session 當日建立的產品策略/商業模式 strawman）。

---

## 跨 session 事件與學到的事

- **共用工作目錄並行切換分支 → 差點遺失 commit**：戒除/減低的 commit 一度被接到另一條分支，所幸對方以 PR #29 合進 main、未遺失；過程靠 reflog + cherry-pick + rebase 釐清。
- **建議**：各 session 改用**獨立 git worktree**（repo 已有 `worktrees/`），不要共用同一 working directory 互相 `git checkout`；schema 僅 additive/nullable、push 前 `git fetch && git pull`，主分支保持 schema superset。

## 仍未解（接續）

- **使用者端認證/授權 IDOR**：`/api/tasks?userId=` 等仍信任前端 userId — 待整合 **cofit 會員系統**（需 cofit 提供驗證機制規格，詳見 HANDOFF §4-1）。**上線前必處理。**
- dev=prod 共用 DB、部署 `prisma db push --accept-data-loss`（HANDOFF §4）。
- Slice O/Q（完成地點 / 美食回憶照片）功能未完成，前端已隱藏待恢復。
