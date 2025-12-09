import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// PUT: Update user profile (nickname, phone, password)
export async function PUT(request) {
    try {
        const body = await request.json();
        const { userId, nickname, phone, oldPassword, newPassword } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
        }

        // Build update data
        const updateData = {};

        // Update nickname
        if (nickname !== undefined && nickname !== user.nickname) {
            updateData.nickname = nickname;
        }

        // Update phone
        if (phone !== undefined && phone !== user.phone) {
            // Check if phone is already used by another user
            const existingUser = await prisma.user.findFirst({
                where: {
                    phone,
                    id: { not: userId }
                }
            });
            if (existingUser) {
                return NextResponse.json({ error: '此手機號碼已被使用' }, { status: 400 });
            }
            updateData.phone = phone;
        }

        // Update password if requested
        if (newPassword) {
            if (!oldPassword) {
                return NextResponse.json({ error: '請輸入舊密碼' }, { status: 400 });
            }

            // Verify old password
            if (!user.password) {
                // User doesn't have a password set (e.g., registered without one)
                // Allow setting a new password
            } else {
                const isValid = await bcrypt.compare(oldPassword, user.password);
                if (!isValid) {
                    return NextResponse.json({ error: '舊密碼不正確' }, { status: 400 });
                }
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: '沒有需要更新的資料', user: { id: user.id, nickname: user.nickname, phone: user.phone } });
        }

        // Perform update
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                nickname: true,
                phone: true,
                email: true,
            }
        });

        return NextResponse.json({
            message: '資料已更新',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: '更新失敗' }, { status: 500 });
    }
}

// GET: Get user profile
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nickname: true,
                phone: true,
                email: true,
                createdAt: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
    }
}
