import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/adminAuth';

// POST /api/admin/auth/logout — 清除後台 session cookie。
// 放行於 middleware？否：登出本就需要已登入；但清 cookie 不需 admin 權限，
// 為簡化在 middleware 額外放行此路徑（見 middleware.js）。
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
