import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const titles = await prisma.expertTitle.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(titles);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch titles' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const title = await prisma.expertTitle.create({
            data: { name }
        });
        return NextResponse.json(title);
    } catch (error) {
        console.error('Create title error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Title already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create title: ' + error.message }, { status: 500 });
    }
}
