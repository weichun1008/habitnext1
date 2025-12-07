import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone, countryCode, password, verificationCode } = body;

        // 1. Validate Fields
        if (!phone || !countryCode || !password || !verificationCode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Validate Verification Code (Mock Global Code)
        if (verificationCode !== '8888') {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 3. Normalize Phone
        // Assuming frontend sends countryCode separate. We store normalized or separate? 
        // Schema has separate `countryCode`. `phone` is unique.
        // Let's ensure uniqueness on phone (users might reuse phone if they change country code? unlikely).
        // Best practice: Store E.164 if possible, or just trust the input is unique "local number".
        // Let's assume `phone` is the full number or local number. The schema says `phone` is unique.
        // We'll check if `phone` exists.

        const existingUser = await prisma.user.findUnique({
            where: { phone }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        // 4. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Create User
        // Use user's last 4 digits as nickname default?
        const defaultNickname = `User_${phone.slice(-4)}`;

        const newUser = await prisma.user.create({
            data: {
                phone,
                countryCode,
                password: hashedPassword,
                nickname: defaultNickname, // Default nickname
            }
        });

        // 6. Return Success
        return NextResponse.json({
            success: true,
            userId: newUser.id,
            nickname: newUser.nickname
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
