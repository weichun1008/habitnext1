# 規格文件指南

## 目的
`.specs/` 目錄包含專案的技術規格文件，用於：
- 記錄功能設計決策
- 追蹤實作進度
- 作為開發參考

---

## 命名規範

```
NNN_feature_name.md
```

- `NNN`：3 位數序號（001, 002, ...）
- `feature_name`：功能名稱（小寫底線）

---

## 文件結構

```markdown
# Feature Spec: NNN - 功能名稱

## 1. Overview
簡述功能目的

## 2. 資料模型
Prisma Schema 或資料結構

## 3. API 端點
路由和請求/回應格式

## 4. UI 元件
頁面和互動邏輯

## 5. 商業邏輯
核心演算法或流程

## N. 狀態
- [x] 已完成項目
- [ ] 待完成項目
```

---

## 更新時機

| 情況 | 動作 |
|------|------|
| 新功能開發 | 建立新 spec 或更新現有 |
| Bug 修復 | 通常不需更新 |
| 資料結構變更 | 更新資料模型區段 |
| API 變更 | 更新 API 區段 |
| 功能完成 | 更新狀態區段 ✅ |

---

## 目前文件

| 編號 | 名稱 | 說明 |
|------|------|------|
| 001 | initial_core | 核心功能 |
| 002 | registration_auth | 註冊認證 |
| 003 | template_phase_system | 三層模板系統 |
| 004 | habit_library | 習慣庫系統 |
| 005 | recurrence_system | 重複週期系統 |
| 006 | user_profile | 用戶個人資料 |
| 007 | habit_calendar | 習慣日曆 |
| 008 | client_habit_library | 客戶端習慣庫 |
| - | MANUAL_TEST_CASES | 手動測試案例 |

---

## 開發工作流程

```
📝 規格 → 📋 計畫 → ✅ 任務 → 💻 實作 → 🧪 驗證
```

### 完整流程

1. **規格定義** (`/speckit.specify`)
   - 建立 `.specs/NNN_feature.md`
   - 定義功能目的、資料模型、API、UI

2. **實作計畫** (`/speckit.plan`)
   - 建立 `implementation_plan.md`
   - 列出要修改的檔案和變更內容
   - **需用戶審核後才能進入實作**

3. **任務分解** (`/speckit.tasks`)
   - 更新 `task.md` 為 checklist
   - 每個項目對應一個可驗證的小任務

4. **執行實作** (`/speckit.implement`)
   - 按 task.md 順序完成各項
   - 自動 commit 和 push

5. **驗證記錄** 
   - 更新 `walkthrough.md` 記錄完成內容
   - 更新 spec 文件狀態為 `[x]`

---

## 參考資料

- [GitHub Spec-Kit](https://github.com/github/spec-kit) - Spec-Driven Development 概念來源
- [專案守則](/CONSTITUTION.md) - 本專案開發原則
