import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Register a new user (client registration)
export async function POST(request) {
    try {
        const body = await request.json();
        const { nickname, phone, email } = body;

        if (!nickname || !phone) {
            return NextResponse.json({ error: '請填寫暱稱和電話' }, { status: 400 });
        }

        // Check if phone already exists
        const existingUser = await prisma.user.findUnique({
            where: { phone }
        });

        if (existingUser) {
            return NextResponse.json({ error: '此電話號碼已註冊' }, { status: 400 });
        }

        const user = await prisma.user.create({
            data: {
                nickname,
                phone,
                email: email || null,
                isActive: true
            }
        });

        return NextResponse.json({
            id: user.id,
            nickname: user.nickname,
            phone: user.phone,
            message: '註冊成功'
        });

    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: `註冊失敗: ${error.message}` }, { status: 500 });
    }
}
