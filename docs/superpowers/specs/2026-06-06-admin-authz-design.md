# 後台 API 伺服器端授權 — 設計文件

- 日期：2026-06-06
- 範圍：web-app/ — 為所有 `/api/admin/*` 端點加上伺服器端授權。

## 問題

目前 admin 登入(`POST /api/admin/auth/login`)只比對 Expert 的 email/密碼(bcrypt),回傳 expert 物件,client 存進 `localStorage.admin_expert`。**沒有任何伺服器端憑證**,把關全在前端(`admin/dashboard/layout.js` 檢查 `role`)。任何人都能直接呼叫 23 個 `/api/admin/*`(含寫入)端點,例如核准/退回社群計畫、改模板、建專家。

## 目標

- 所有 `/api/admin/*`(含 GET 與 mutation)需通過伺服器端 admin 授權,唯一例外 `/api/admin/auth/login`。
- `/api/admin/auth/register` 也納入保護(只有已登入 admin 能建專家)。
- 最小改動、不新增依賴、不改 schema(共用 Neon DB,additive 原則自然滿足——本案無 DB 變更)。
- 前端既有 admin fetch 幾乎不用改(靠同源 cookie 自動帶上)。

## 方案:Next middleware + httpOnly 簽章 cookie

唯一關卡攔截 `/api/admin/:path*`,不會漏掉新端點。

### 元件

- **`src/lib/adminAuth.js`**(Edge 相容,使用 Web Crypto `crypto.subtle`,無新依賴):
  - `signSession(payload, secret)` → `Promise<token>`:token = `base64url(JSON(payload)) + '.' + base64url(HMAC-SHA256)`;payload 含 `{ expertId, role, email, exp }`(`exp` = 發證時間 + 7 天的 epoch 秒)。
  - `verifySession(token, secret)` → `Promise<payload | null>`:驗 HMAC(constant-time 比對)、檢查 `exp` 未過期;失敗回 null。
  - `isAdmin(payload)` → bool:`payload && (payload.role === 'admin' || payload.email === 'admin@habit.next')`(沿用 layout.js 既有判定)。
  - `COOKIE_NAME = 'admin_session'`、`SESSION_TTL_SECONDS = 7*24*3600`。
  - 讀 `process.env.ADMIN_SESSION_SECRET`;未設 → 視為無效(fail-closed)。
- **`src/app/api/admin/auth/login/route.js`**(修改):驗證成功後 `signSession`,以 `Set-Cookie` 種 `admin_session`(`HttpOnly; SameSite=Lax; Path=/; Max-Age=604800; Secure`(production))。仍回傳 safeExpert 給前端顯示。
- **`src/app/api/admin/auth/logout/route.js`**(新增):清 cookie(Max-Age=0)。
- **`web-app/src/middleware.js`（本專案用 src/ 目錄，middleware 須置於 src/）**(新增):`export const config = { matcher: ['/api/admin/:path*'] }`。流程:
  1. 放行 `/api/admin/auth/login`(以 `pathname` 判斷)。
  2. 讀 `admin_session` cookie → `verifySession`。null → 401 JSON `{ error: '未授權' }`。
  3. `isAdmin(payload)` 為 false → 403 JSON `{ error: '需要管理員權限' }`。
  4. 通過 → `NextResponse.next()`。
- **`src/app/admin/dashboard/layout.js`**(修改):登出時改呼叫 `/api/admin/auth/logout`(清伺服器 cookie)再清 localStorage。

### 為何不選其他方案

- 每支 route 各自 `requireAdmin()`:要改 ~21 檔、易漏新端點。
- Bearer token + header:要改每處前端 fetch、token 存 localStorage(XSS 風險)。

middleware 為單一關卡、最難遺漏,且同源 cookie 自動帶上 → 前端 fetch 不需改。

## 邊界與決策

- **涵蓋全部方法(含 GET)**:後台清單(如使用者名單)也不應公開。
- **register 納入保護**:假設已存在 admin 帳號;初始建號可由既有 admin 操作或直接資料庫。
- **TTL 7 天**;到期需重新登入(可接受,後台非高頻)。
- **fail-closed**:`ADMIN_SESSION_SECRET` 未設或 cookie 無效一律拒絕。需在本機 `.env.local` 與 Vercel 設定此密鑰(部署前設定,否則後台全部 401)。
- 非 admin 角色的 expert:目前後台 dashboard 本就僅 admin 可用(layout 會導走),故 `/api/admin/*` 一律要求 admin 一致。
- runtime:middleware 在 Edge 執行,僅做簽章驗證(不查 DB);payload 自帶 role/email 足夠。token 由登入時簽發,撤銷以 TTL 到期為準(本案不做即時撤銷清單,YAGNI)。

## 測試

- `adminAuth`(純函式,jsdom/node):sign→verify round-trip;竄改 payload/簽章 → null;過期 → null;`isAdmin` 各情境;secret 未設 → verify 回 null。
- middleware(node):無 cookie → 401;竄改 cookie → 401;有效但非 admin → 403;有效 admin → next();`auth/login` 路徑放行。
- login route:成功登入回應含 `Set-Cookie: admin_session`;失敗不種 cookie。

## 風險

- **部署前必須設 `ADMIN_SESSION_SECRET`**(Vercel 環境變數),否則後台全 401。部署步驟需明確提示。
- middleware matcher 僅 `/api/admin/*`,不影響其他路由與其他併行 session 的工作。
- 無 schema 變更 → 對共用 DB 零風險。
