import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all users (with search and pagination)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const where = search ? {
            OR: [
                { nickname: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } }
            ]
        } : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    _count: { select: { tasks: true, assignments: true } },
                    assignments: {
                        where: { status: 'active' },
                        include: {
                            template: { select: { name: true } },
                            expert: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.user.count({ where })
        ]);

        return NextResponse.json({
            users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ error: `取得用戶列表失敗: ${error.message}` }, { status: 500 });
    }
}
