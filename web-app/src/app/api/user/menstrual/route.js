import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/user/menstrual { userId, isMenstrual }
// Toggles isMenstrual + menstrualStart on all active Assignment for the user.
export async function POST(request) {
    try {
        const { userId, isMenstrual } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const now = new Date();
        if (isMenstrual) {
            await prisma.assignment.updateMany({
                where: { userId, status: 'active' },
                data: { isMenstrual: true, menstrualStart: now },
            });
        } else {
            await prisma.assignment.updateMany({
                where: { userId, status: 'active' },
                data: { isMenstrual: false, menstrualStart: null },
            });
        }

        const assignments = await prisma.assignment.findMany({
            where: { userId, status: 'active' },
            select: { id: true, isMenstrual: true, menstrualStart: true },
        });
        return NextResponse.json({ assignments });
    } catch (error) {
        console.error('Menstrual toggle error:', error);
        return NextResponse.json({ error: 'Failed to toggle' }, { status: 500 });
    }
}
