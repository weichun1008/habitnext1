# 專案守則 (Project Constitution)

## 1. 專案概述

**HabitNext** 是一個習慣追蹤與行為改變平台，連結專家與用戶，透過結構化的計畫模板幫助用戶建立持久的健康習慣。

---

## 2. 核心原則

### 2.1 設計原則
- **用戶體驗優先**：介面簡潔直覺，降低用戶學習成本
- **專家賦能**：讓行為改變專家能輕鬆建立和管理計畫模板
- **漸進式挑戰**：支援多階段、多難度的習慣養成路徑

### 2.2 技術原則
- **簡單優於複雜**：優先使用原生功能，避免過度工程
- **一致性**：API、命名、結構保持一致風格
- **可維護性**：程式碼清晰易讀，適當註解

---

## 3. 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 (App Router) |
| 樣式 | CSS + 自訂設計系統 |
| 資料庫 | PostgreSQL (Prisma) |
| 部署 | Vercel |

---

## 4. 開發流程

```
1. 規格定義 → .specs/NNN_feature.md
2. 實作計畫 → implementation_plan.md (需審核)
3. 任務分解 → task.md
4. 執行實作 → 程式碼變更
5. 驗證測試 → walkthrough.md
6. 更新規格狀態 → [x] 完成
```

---

## 5. AI 協作守則

### 5.1 AI 應該：
- ✅ 主動更新規格文件狀態
- ✅ 完成後自動 commit 和 push
- ✅ 遵循現有程式碼風格
- ✅ 提供清晰的變更說明

### 5.2 AI 需要確認：
- ⚠️ 破壞性資料庫操作（reset, accept-data-loss）
- ⚠️ 刪除檔案
- ⚠️ 重大架構變更

---

## 6. 命名規範

| 類型 | 規範 | 範例 |
|------|------|------|
| 檔案 | kebab-case | `user-profile.js` |
| 元件 | PascalCase | `TaskFormModal` |
| 函數 | camelCase | `handleSave` |
| API 路由 | kebab-case | `/api/admin/plan-categories` |
| Prisma 模型 | PascalCase | `PlanCategory` |

---

## 7. 測試標準

- **功能測試**：每個新功能需要手動驗證
- **API 測試**：使用 curl 確認端點正常
- **UI 測試**：瀏覽器實際操作確認

---

## 8. 文件位置

| 文件 | 位置 |
|------|------|
| 規格文件 | `web-app/.specs/` |
| 工作流程 | `.agent/workflows/` |
| 資料庫設定 | `web-app/prisma/schema.prisma` |
| 專案守則 | `CONSTITUTION.md` |
