import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch active official habits for client-side habit library
// This is a PUBLIC endpoint (no auth required)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryFilter = searchParams.get('category');

        // Get all categories with order
        const categories = await prisma.habitCategory.findMany({
            orderBy: { order: 'asc' }
        });

        // Build category order map
        const categoryOrderMap = {};
        categories.forEach((cat, index) => {
            categoryOrderMap[cat.name] = cat.order ?? index;
        });

        // Fetch habits
        const where = { isActive: true };
        if (categoryFilter) {
            where.category = categoryFilter;
        }

        const habits = await prisma.officialHabit.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Sort habits by category order, then by createdAt
        const sortedHabits = habits.sort((a, b) => {
            const orderA = categoryOrderMap[a.category] ?? 999;
            const orderB = categoryOrderMap[b.category] ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Also return categories for filtering
        return NextResponse.json({
            habits: sortedHabits,
            categories: categories.map(c => ({ id: c.id, name: c.name, color: c.color, order: c.order }))
        });

    } catch (error) {
        console.error('Fetch habits (public) error:', error);
        return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }
}
