import { NextResponse } from 'next/server';
import { evaluateAdminRequest, COOKIE_NAME } from '@/lib/adminAuth';

// 伺服器端後台授權關卡。攔截所有 /api/admin/*：
//   - 放行 /api/admin/auth/login、/api/admin/auth/logout
//   - 其餘需有效、未過期、admin 身份的 httpOnly 簽章 cookie，否則 401/403
// fail-closed：未設 ADMIN_SESSION_SECRET 或 cookie 無效一律拒絕。
export const config = { matcher: ['/api/admin/:path*'] };

export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const result = await evaluateAdminRequest({
    pathname: request.nextUrl.pathname,
    token,
    secret: process.env.ADMIN_SESSION_SECRET,
  });
  if (result.allow) return NextResponse.next();
  return NextResponse.json({ error: result.error }, { status: result.status });
}
