import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signSession, COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/adminAuth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const expert = await prisma.expert.findUnique({
            where: { email }
        });

        if (!expert) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, expert.password);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Return expert info (without password) + 種 httpOnly 簽章 session cookie
        const { password: _, ...safeExpert } = expert;
        const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
        const token = await signSession(
            { expertId: expert.id, role: expert.role, email: expert.email, exp },
            process.env.ADMIN_SESSION_SECRET
        );
        const response = NextResponse.json(safeExpert);
        if (token) {
            response.cookies.set(COOKIE_NAME, token, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: SESSION_TTL_SECONDS,
            });
        }
        return response;

    } catch (error) {
        console.error('Expert login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
