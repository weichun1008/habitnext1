import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Expert login with PIN
export async function POST(request) {
    try {
        const { name, pin } = await request.json();

        if (!name || !pin) {
            return NextResponse.json({ error: '請輸入姓名和 PIN 碼' }, { status: 400 });
        }

        const expert = await prisma.expert.findFirst({
            where: { name, pin }
        });

        if (!expert) {
            return NextResponse.json({ error: '登入失敗，請確認姓名和 PIN 碼' }, { status: 401 });
        }

        // Return expert info (without PIN)
        const { pin: _, ...safeExpert } = expert;
        return NextResponse.json(safeExpert);

    } catch (error) {
        console.error('Expert login error:', error);
        return NextResponse.json({ error: `登入失敗: ${error.message}` }, { status: 500 });
    }
}

// PUT: Create new expert account (admin setup)
export async function PUT(request) {
    try {
        const { name, title, pin, avatar } = await request.json();

        if (!name || !title || !pin) {
            return NextResponse.json({ error: '請填寫完整資料' }, { status: 400 });
        }

        const expert = await prisma.expert.create({
            data: { name, title, pin, avatar }
        });

        const { pin: _, ...safeExpert } = expert;
        return NextResponse.json(safeExpert);

    } catch (error) {
        console.error('Create expert error:', error);
        return NextResponse.json({ error: `建立專家帳號失敗: ${error.message}` }, { status: 500 });
    }
}
