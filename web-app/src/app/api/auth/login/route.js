import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const { phone, password } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { phone },
            include: { tasks: { include: { history: true } } }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password
        // Note: For existing legacy users without password, this might fail or we need migration strategy?
        // Since we didn't migrate users, legacy users have null password.
        // We can block them or allow them to set password?
        // Spec implies new registration flow. Legacy users might effectively be locked out until they register again or reset? 
        // For this task, we enforce password check.

        if (!user.password) {
            return NextResponse.json({ error: 'Please register first' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Return user info
        const { password: _, ...safeUser } = user;
        return NextResponse.json(safeUser);

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
