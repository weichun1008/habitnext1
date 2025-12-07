import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

        // Return expert info (without password)
        const { password: _, ...safeExpert } = expert;
        return NextResponse.json(safeExpert);

    } catch (error) {
        console.error('Expert login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
