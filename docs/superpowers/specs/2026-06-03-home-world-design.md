# 居家世界（Home World）Design Spec

> 狀態：草稿待 review · 日期 2026-06-03
> 平行於：旅程世界（Slice P，已上線，location 驅動）、公仔世界（另一 session 進行中）
> 視覺脈絡：`docs/superpowers/notes/2026-05-28-gamification-exploration.md`（珍惜驅動、零懲罰、工具/收集分離哲學）

## 0. 一句話

把使用者「完成了多少習慣、哪些面向」渲染成一個**會越住越溫馨的家**——9 大 GENESIS+IO 健康面向各對應家裡一個區域，完成那個面向的習慣就解鎖家具，使用者把解鎖的家具擺進房間。**零 location、零拍照、零隱私顧慮，所有使用者都能玩**。

## 1. 三個世界的關係（重要：共用基礎）

經與 PM 確認，三個遊戲化「世界」不是並存，而是**可切換、同時只玩一種**：

```
使用者目前 active 的世界 = 旅程世界 / 公仔世界 / 居家世界（擇一）
切換世界 → 之後的完成數歸給新世界累積
舊世界進度不歸零，切回去可繼續玩
```

這帶出一個**跨 session 共用的基礎機制**（居家世界 + 公仔世界都需要），本 spec 定義其契約，但實作歸屬待與公仔世界 session 對齊：

### 1.1 共用契約 — World Attribution（§9 待協調）

```diff
model User {
+ activeWorld String @default("home")   // 'home' | 'figure' | 'journey'
}

model TaskHistory {
+ world String?   // 完成當下使用者的 activeWorld 快照；null = 此機制上線前的舊資料
}
```

- 每次習慣完成寫 TaskHistory 時，順手記下當時的 `user.activeWorld`。
- 居家世界的完成數 = `count(TaskHistory where world='home' AND completed)`，依 domain 分組——**與旅程世界用 `city` 衍生完全同模式**，只是 group key 從 city 換成 world+domain。
- 切換世界 = 改 `User.activeWorld`；不回溯改舊紀錄。
- **舊資料（world IS NULL）的歸屬**：v1 一次性 backfill 成預設世界（見 §9 開放問題 1），或視為「共同序章」全部世界都看得到——待定。

> 旅程世界（Slice P）目前是「不分世界、看所有有 city 的完成」。導入 world attribution 後，旅程世界可選擇性地也只算 `world='journey'` 的——但那是旅程世界的事，本 spec 不改它。**居家世界只讀 `world='home'`。**

## 2. 範圍

### 做（居家世界 v1，分階段見 §8）
- 側邊欄新增 `home`（居家）view（與 daily/journey/stats 同層 `setCurrentView`）。
- **9 大 domain → 9 個居家區域**（§4 映射表）。
- **家具解鎖**：每個區域依「該 domain 在 home 世界的完成數」解鎖一批家具（tier 制，§5）。
- **使用者佈置**：解鎖的家具可放進該區域的格位（slot-based，§6）。
- **房間視覺**：等距（isometric）SVG 房間，分區呈現，已擺家具渲染其中（§7）。
- World 切換器：頂部一個切換控制，選 active 世界（§1）。
- `homeWorld` 純函式衍生 lib（解鎖判定、進度）+ TDD。
- 家具目錄 seed（`furnitureCatalog`）。
- 空狀態（還沒解鎖任何家具 → 引導完成第一個習慣）。

### 不做（後續 / 其他 session）
- 公仔站進房間裡走動 ＝ 公仔世界 session 整合時談（§9 開放問題 2）。
- 家具自由旋轉 / 像素級拖拉 ＝ v1 用固定格位，不做 free-drag。
- 跨使用者訪客（去別人家參觀）＝ 未來社交 slice。
- 家具買賣 / 虛擬貨幣經濟 ＝ 不做（呼應「珍惜驅動 ≠ 課金」）。
- 任何懲罰機制（漏天家具消失）＝ **絕不做**。零懲罰。

## 3. 設計哲學（承接 gamification note）

1. **普惠優先** — 旅程世界要 opt-in location 才能玩，門檻高；居家世界只靠完成數，**人人開箱即玩**。這是它存在的核心理由。
2. **第一人稱親密感** — 「我的家」比「我的城市」更貼身、更療癒，越住越捨不得。
3. **養成感 > 數字** — 使用者親手把家具擺進房間（不是系統自動長），勞動帶來 ownership。
4. **工具/收集分離** — 「今天」分頁純清單；「居家」分頁才是遊戲化。不潑灑、不麻痺。
5. **零懲罰** — 漏天不失家具，只是沒解鎖新的。

## 4. domain → 居家區域映射

9 大 GENESIS+IO domain（正典 `prisma/seed/genesis-io.json`）各對應家中一區：

| Domain | 居家區域 | 區域 icon 意象 | 家具範例（由淺到深解鎖） |
|---|---|---|---|
| 飲食 | 廚房 / 餐廳 | 🍽 | 水杯 → 餐桌 → 開放廚房 → 中島吧台 |
| 運動 | 健身角 / 陽台 | 🏋 | 瑜伽墊 → 啞鈴架 → 跑步機 → 全套健身房 |
| 壓力與睡眠 | 臥室 | 🛏 | 枕頭 → 床 → 香氛機 → 遮光窗簾＋四柱床 |
| 認知與智慧 | 書房 / 書牆 | 📚 | 書一本 → 書架 → 書桌 → 整面書牆＋閱讀椅 |
| 社交互動 | 客廳 | 🛋 | 椅子 → 沙發 → 茶几＋電視 → 待客大客廳 |
| 心靈 | 冥想角 / 窗邊 | 🧘 | 坐墊 → 蒲團＋盆栽 → 窗邊禪座 → 冥想室 |
| 環境 | 玄關 / 植栽 | 🌿 | 小盆栽 → 落地植物 → 玄關櫃 → 綠意中庭 |
| 基因與腸道 | 保健櫃 / 浴室 | 💊 | 水杯 → 保健櫃 → 體重計 → 健康管理牆 |
| 職涯與平衡 | 工作桌 | 💼 | 筆電 → 升降桌 → 雙螢幕 → 完整 home office |

- 對不到 domain 的完成（`categoryToDomain → 'other'`）＝ 算進「總完成數」但不解鎖任何特定區域；可累積到一個通用「裝飾雜物」池（小擺設、地毯、燈），任意區域可用。
- 重用既有 `categoryToDomain()` lib（Slice P 已寫，含髒值正規化）——不重造。

## 5. 家具解鎖規則

### 5.1 每區域的解鎖階梯（純函式 `homeWorld.js`）

```js
// 集中常數，spec 給初值、日後微調（對齊 journeyWorld.js 風格）
const FURNITURE_UNLOCK_THRESHOLDS = [1, 5, 15, 40];  // 該 domain 在 home 世界的完成數
// → 解鎖第 1/2/3/4 件該區域核心家具
const DECOR_EVERY = 8;   // 「other」完成每 8 次解鎖 1 件通用裝飾
```

- `unlockedFurniture(domainCount)` → 回傳該區域已解鎖的家具 index 陣列（`[0]` / `[0,1]` / …）。
- 封頂後（>40）持續完成 → 解鎖該區域的「變體 / 升級皮膚」（不封頂，款式輪替，類似 journeyWorld `buildingStyleIndex`）。
- **解鎖即恭喜、不強制擺**：解鎖的家具進「待擺清單」，使用者想擺再擺。

### 5.2 為什麼門檻比旅程世界低

旅程世界 city tier 門檻是 1/10/30/80/200（因為它是「整座城市」的宏觀尺度）。居家世界是**單一房間**尺度，每區域 4 件核心家具足以「填滿」，門檻 1/5/15/40 讓新手快速有成就感（第一次完成就解鎖第一件家具 → 即時回饋）。

## 6. 佈置（Placement）資料模型與 UX

### 6.1 Schema（居家世界專屬）

```diff
+ model HomeFurniturePlacement {
+   id          String   @id @default(cuid())
+   userId      String
+   user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+   furnitureId String   // 對應 furnitureCatalog 的 id（e.g. 'kitchen_table')
+   zone        String   // 9 區域 key（e.g. 'kitchen'）— 冗余存方便查詢，由 furnitureId 決定
+   slot        Int      // 該區域的格位索引（0..N-1）；slot-based 不做像素級自由擺放
+   createdAt   DateTime @default(now())
+   updatedAt   DateTime @updatedAt
+   @@unique([userId, furnitureId])   // 一件家具同時只在一處
+   @@index([userId, zone])
+ }
```

- **不存「解鎖狀態」**：解鎖純從完成數衍生（§5），與旅程世界「等級都從 TaskHistory 算」一致、無需資料遷移。只有「擺位」需要存（那是使用者的創作，無法從完成數推導）。
- 一件家具一個 unique 約束（避免同一件被放兩格）。

### 6.2 Slot-based 佈置（v1 簡化）

- 每個區域有固定數量格位（e.g. 廚房 6 格、客廳 8 格），畫在等距房間的明確落點。
- 佈置流程：點區域 → 進「佈置模式」→ 左側「待擺家具抽屜」（已解鎖未擺的）→ 點家具 → 點空格位放入 / 點已擺家具移除回抽屜。
- **不做 free drag-drop**（v1）：手機上像素級拖拉難用、且要處理碰撞。Slot-based 乾淨、確定、好做、好測。
- 預設佈置：使用者第一次解鎖家具時，**自動擺進該區域第一個空格**（不要逼使用者一定要手動才看得到東西）；之後可自由調整。

### 6.3 確定性 — 空格位佈局

同旅程世界原則：格位座標由 `layoutZone(zoneKey) → [{slot, x, y}]` 純函式產生，**禁用 render 期 Math.random()**。同一房間每次畫都一樣。

## 7. 視覺系統

- **等距（2.5D isometric）SVG 房間**：比旅程世界的平面城市更有「空間感」、更像家。一個大房子俯視 + 分區，或一次聚焦一個區域、頂部區域切換膠囊。
- v1 建議：**單一房子分 9 區的等距俯視圖**，已解鎖家具畫在各區格位；點某區放大進該區佈置。
- 風格延續旅程世界：純 SVG、手繪溫暖色、零外部資產（或最小化）。
- 家具用 SVG path / 簡單幾何 + domain 代表色（重用 `CATEGORY_CONFIG` 色票，evidence badge 那次學到的教訓：**色票 class 若放 lib 要確保 tailwind content 掃得到**，已於 `fix/tailwind-scan-lib` 修好，lib 在 content glob 內）。
- 空狀態：空房子輪廓 + 「完成第一個習慣，搬進你的家」。

## 8. 分階段實作（對齊 O→P→Q 模式）

| 階段 | 範圍 | schema | 可上線單位 |
|---|---|---|---|
| **H1 — 世界切換基礎** | `User.activeWorld` + `TaskHistory.world` + 完成時寫入 + 切換器 UI + backfill | 改 2 表 | 切換器能用（即使只有居家世界一個選項） |
| **H2 — 居家衍生 + 唯讀房間** | `homeWorld.js`（解鎖判定/進度 TDD）+ furnitureCatalog seed + 等距房間 SVG + 自動佈置（解鎖即進第一格）+ 聚合 API | 零（衍生＋seed） | 房間隨完成數自動長家具，先不可手動擺 |
| **H3 — 手動佈置** | `HomeFurniturePlacement` schema + 佈置模式 UI（抽屜＋格位）+ 擺/移 API | 加 1 表 | 完整可佈置 |
| **H4 — 打磨** | 解鎖恭喜動畫、區域放大過場、變體皮膚、空狀態文案、bundle 預算 | 零 | polish |

H1 是跟公仔世界 session 共用的基礎——**H1 動工前必須先與該 session 對齊**（§9）。H2 起是居家世界專屬，可獨立推進。

## 9. 開放問題（待 review / 跨 session 協調）

1. **舊資料（`world IS NULL`）歸屬** — 機制上線前的完成數算哪個世界？選項：(a) 全部 backfill 給預設世界 `home`；(b) 視為「共同序章」三世界都看得到；(c) 不算進任何世界（只有上線後的新完成才計分）。我傾向 (b)——最不會讓使用者覺得「我的努力被分走了」。
2. **World 切換基礎由誰實作** — 居家 + 公仔都需要 `activeWorld` + `TaskHistory.world`。應由**先動工的一方實作 H1、另一方共用**，或抽成獨立 PR 兩方都依賴。需與公仔世界 session 對齊 schema 命名（`activeWorld` 的 enum 值、`world` 欄位）。**這份 spec 先把契約定下來當對齊基準。**
3. **公仔 ↔ 居家整合** — 未來公仔是否站在居家房間裡？若是，公仔世界的角色資產要能 render 進 `home` 房間。v1 不做，但 schema / 渲染留擴充餘地（房間 SVG 預留一個「角色層」）。
4. **切換頻率限制** — 要不要防止使用者一天狂切世界刷分？我傾向不限（零懲罰哲學、且完成數本來就慢）。
5. **區域格位數量** — 各區幾格？影響「填滿感」節奏。需配 furnitureCatalog 件數定。spec 先不寫死，H2 調。

## 10. 與既有系統的一致性檢查

- ✅ 重用 `categoryToDomain()`（Slice P）做 domain 正規化，不重造。
- ✅ 重用 `CATEGORY_CONFIG` 色票（含 tailwind content 已掃 lib 的修正）。
- ✅ 純函式 lib + 集中常數 + 確定性佈局 + TDD —— 完全對齊 `journeyWorld.js` 慣例。
- ✅ 側邊欄 `setCurrentView` 模式，不引入 bottom-tab。
- ✅ 零懲罰、opt-in、工具/收集分離 —— 對齊 gamification note 哲學。
- ⚠️ World attribution 改 `TaskHistory` + `User` —— 是這套世界系統第一次「為了遊戲化而改核心 schema」（旅程世界靠 Slice O 的 location 欄位、沒為遊戲化本身改 schema）。需確認 PM 接受這個取捨（換來「可切換世界 + per-world 進度」這個 PM 已確認要的機制）。

## 11. Acceptance Criteria（spec 階段）

- [ ] 本 spec push 到 `docs/home-world-design` 並開 PR
- [ ] 與公仔世界 session 對齊 §1.1 World Attribution 契約（schema 命名、舊資料歸屬）
- [ ] PM 確認 §9 開放問題 1（舊資料歸屬）、4（切換限制）
- [ ] 確認後再寫 H1 實作 plan，不先寫 code
