import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        const { nickname, phone } = await request.json();

        if (!nickname || !phone) {
            return NextResponse.json({ error: 'Nickname and phone are required' }, { status: 400 });
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { phone },
            include: { tasks: { include: { history: true } } } // Include tasks and history on login
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    nickname,
                    phone,
                    // We could create default tasks here if we wanted
                },
                include: { tasks: { include: { history: true } } }
            });
        } else {
            // Update nickname if changed? Optional.
            if (user.nickname !== nickname) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { nickname },
                    include: { tasks: { include: { history: true } } }
                });
            }
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
