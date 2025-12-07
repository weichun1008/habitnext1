# 如何部署到 Vercel

由於您的專案現在是一個 Next.js 應用程式 (`web-app` 資料夾)，部署到 Vercel 是最簡單的選擇。

## 方法一：使用 GitHub (推薦)

這是最標準且自動化的方式。

1.  **將程式碼推送到 GitHub**
    -   如果您還沒有將此專案推送到 GitHub，請先建立一個新的 Repository 並推送上去。
    -   確保 `web-app` 資料夾在您的 Repository 中。

2.  **在 Vercel 匯入專案**
    -   前往 [Vercel Dashboard](https://vercel.com/dashboard)。
    -   點擊 **"Add New..."** -> **"Project"**。
    -   選擇 **"Import"** 您的 GitHub Repository。

3.  **設定 Root Directory (關鍵步驟)**
    -   在設定頁面中，找到 **"Root Directory"** 選項。
    -   點擊 **"Edit"** 並選擇 `web-app` 資料夾。
    -   *原因：您的 Next.js 專案不是在根目錄，而是在 `web-app` 子目錄中。*

4.  **點擊 Deploy**
    -   Vercel 會自動偵測 Next.js 並開始建置。
    -   等待約 1-2 分鐘，部署完成後您會獲得一個網址 (例如 `your-project.vercel.app`)。

## 方法二：使用 Vercel CLI (如果您不想用 GitHub)

如果您想直接從電腦上傳：

1.  **安裝 Vercel CLI**
    ```bash
    npm i -g vercel
    ```

2.  **登入**
    ```bash
    vercel login
    ```

3.  **部署**
    -   進入 `web-app` 資料夾：
        ```bash
        cd web-app
        ```
    -   執行部署指令：
        ```bash
        vercel
        ```
    -   依照螢幕指示操作 (大多按 Enter 即可)。

---

### 常見問題

-   **環境變數**：如果您未來有用到 API Key，記得在 Vercel 的 Settings -> Environment Variables 中設定。
-   **依賴安裝失敗**：請確保 `web-app/package.json` 存在 (我已經幫您建立了)。
