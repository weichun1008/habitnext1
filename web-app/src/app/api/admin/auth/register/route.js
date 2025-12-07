import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, title, email, password } = body;

        // 1. Validate Fields
        if (!name || !title || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Check if Email already exists
        const existingExpert = await prisma.expert.findUnique({
            where: { email }
        });

        if (existingExpert) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create Expert
        // Default isApproved = false
        const newExpert = await prisma.expert.create({
            data: {
                name,
                title,
                email,
                password: hashedPassword,
                isApproved: false,
                role: 'expert',
            }
        });

        return NextResponse.json({
            success: true,
            expertId: newExpert.id,
            message: 'Registration successful. Waiting for admin approval.'
        });

    } catch (error) {
        console.error('Expert Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
