# Vercel Postgres 資料庫設定指南

由於我們在 Phase 2 加入了後端功能，您需要在 Vercel 上設定一個資料庫來儲存使用者的習慣資料。請按照以下步驟操作：

## 步驟 1：建立資料庫
1.  前往 [Vercel Dashboard](https://vercel.com/dashboard)。
2.  點擊您的專案 (例如 `habit-tracker`)。
3.  點擊上方的 **Storage** 標籤。
4.  點擊 **Create Database** 按鈕。
5.  選擇 **Postgres** (Vercel Postgres)。
6.  點擊 **Continue**。
7.  接受條款 (Accept Terms) 並點擊 **Create**。
8.  選擇一個地區 (Region)，建議選擇離您最近的 (例如 `Washington, D.C., USA (iad1)` 或 `Singapore (sin1)`，通常預設即可)。
9.  點擊 **Create**。

## 步驟 2：連結專案
1.  資料庫建立完成後，您會看到資料庫的詳細頁面。
2.  在左側選單中，點擊 **Projects**。
3.  確認您的專案 (`habit-tracker`) 已經連結 (Connected)。如果沒有，請點擊 **Connect Project** 並選擇您的專案。

## 步驟 3：環境變數 (Environment Variables)
連結專案後，Vercel 會自動將資料庫的連線資訊加入到您專案的環境變數中。
您可以到專案的 **Settings** -> **Environment Variables** 檢查，應該會看到以下變數：
-   `POSTGRES_URL`
-   `POSTGRES_PRISMA_URL`
-   `POSTGRES_URL_NON_POOLING`
-   `POSTGRES_USER`
-   `POSTGRES_HOST`
-   `POSTGRES_PASSWORD`
-   `POSTGRES_DATABASE`

**注意**：您不需要手動複製這些，Vercel 會自動處理。

## 步驟 4：重新部署 (Redeploy)
由於我們修改了 `package.json` 和加入了資料庫設定，您需要觸發一次新的部署。
1.  確認您已經將最新的程式碼 (包含 `prisma` 資料夾和 `package.json` 的修改) 推送到 GitHub。
2.  前往 Vercel Dashboard 的 **Deployments** 標籤。
3.  您應該會看到一個正在進行或剛完成的部署。如果沒有，您可以隨便修改一個檔案 (例如 `README.md`) 並推送到 GitHub 來觸發部署。
4.  **重要**：我們在 `package.json` 的 `build` 指令中加入了 `npx prisma db push`，這會在部署時自動將資料庫結構 (Schema) 推送到您剛建立的資料庫。

## 步驟 5：測試
部署完成後，打開您的應用程式網址：
1.  您應該會看到登入畫面。
2.  輸入暱稱和手機號碼登入。
3.  如果成功登入並進入主畫面，代表資料庫設定成功！

---

### 常見問題
**Q: 部署失敗，顯示 `PrismaClientInitializationError`？**
A: 這通常是因為環境變數沒有正確載入。請確認您已經在 Vercel 的 Storage 頁面將資料庫連結到專案，並且在 Deployments 頁面 Redeploy (勾選 "Use existing Build Cache" 沒關係，但最好是 "Redeploy without cache" 如果有選項的話，或者直接推新 commit)。

**Q: 我可以在本地端連線到這個資料庫嗎？**
A: 可以。您需要安裝 Vercel CLI (`npm i -g vercel`)，然後執行 `vercel env pull .env.local` 來下載環境變數。但由於您目前無法在本地執行 npm，建議直接使用線上環境測試。
