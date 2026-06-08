// src/lib/adminAuth.js
// Edge + Node 相容的後台連線授權：HMAC-SHA256 簽章 token，存於 httpOnly cookie。
// 無新依賴（Web Crypto / globalThis.crypto.subtle），無 DB 變更。
//
// token 格式：base64url(JSON(payload)) + '.' + base64url(HMAC-SHA256(body))
// payload：{ expertId, role, email, exp }（exp = epoch 秒）

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

const textEnc = (s) => new TextEncoder().encode(s);

function b64urlFromBytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(str) {
  const pad = '==='.slice((str.length + 3) % 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', textEnc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// 簽發 token。無 secret → 回 null（fail-closed）。
async function signSession(payload, secret) {
  if (!secret) return null;
  const body = b64urlFromBytes(textEnc(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, textEnc(body));
  return `${body}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

// 驗證 token，回 payload 或 null。檢查簽章（constant-time，subtle.verify）與 exp。
async function verifySession(token, secret) {
  try {
    if (!secret || !token || typeof token !== 'string') return null;
    const dot = token.indexOf('.');
    if (dot < 1 || dot === token.length - 1) return null;
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, bytesFromB64url(sig), textEnc(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(bytesFromB64url(body)));
    if (payload && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function isAdmin(payload) {
  return !!(payload && (payload.role === 'admin' || payload.email === 'admin@habit.next'));
}

// 不需授權即可存取的後台路徑（登入 / 登出）。
const PUBLIC_ADMIN_PATHS = new Set(['/api/admin/auth/login', '/api/admin/auth/logout']);

// 純決策函式（給 middleware 用，可單測）：放行 login/logout；其餘需有效 admin token。
async function evaluateAdminRequest({ pathname, token, secret }) {
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return { allow: true };
  const payload = await verifySession(token, secret);
  if (!payload) return { allow: false, status: 401, error: '未授權' };
  if (!isAdmin(payload)) return { allow: false, status: 403, error: '需要管理員權限' };
  return { allow: true, payload };
}

module.exports = {
  signSession,
  verifySession,
  isAdmin,
  evaluateAdminRequest,
  PUBLIC_ADMIN_PATHS,
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
};
