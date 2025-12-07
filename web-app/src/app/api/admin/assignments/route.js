import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayStr } from '@/lib/utils';

// GET: Fetch all assignments
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const expertId = searchParams.get('expertId');
        const status = searchParams.get('status');

        const where = {};
        if (expertId) where.expertId = expertId;
        if (status) where.status = status;

        const assignments = await prisma.assignment.findMany({
            where,
            include: {
                user: { select: { id: true, nickname: true, phone: true } },
                template: { select: { id: true, name: true, category: true } },
                expert: { select: { id: true, name: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(assignments);

    } catch (error) {
        console.error('Fetch assignments error:', error);
        return NextResponse.json({ error: `取得指派記錄失敗: ${error.message}` }, { status: 500 });
    }
}

// POST: Assign template to user (creates tasks automatically)
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, templateId, expertId, notes, startDate } = body;

        if (!userId || !templateId || !expertId) {
            return NextResponse.json({ error: '請提供完整的指派資訊' }, { status: 400 });
        }

        // Get template and expert data
        const [template, expert] = await Promise.all([
            prisma.template.findUnique({ where: { id: templateId } }),
            prisma.expert.findUnique({ where: { id: expertId } })
        ]);

        if (!template) {
            return NextResponse.json({ error: '模板不存在' }, { status: 404 });
        }
        if (!expert) {
            return NextResponse.json({ error: '專家不存在' }, { status: 404 });
        }

        // Create assignment
        const assignment = await prisma.assignment.create({
            data: {
                userId,
                templateId,
                expertId,
                notes: notes || '',
                startDate: startDate ? new Date(startDate) : new Date()
            }
        });

        // Handle both legacy (flat array) and new 3-layer structure (Plan > Phase > Task)
        let templateTasks = [];
        const rawTasks = template.tasks;
        const assignmentStartDate = assignment.startDate;

        if (Array.isArray(rawTasks)) {
            templateTasks = rawTasks.map(task => ({
                ...task,
                phaseName: null,
                phaseOrder: 0,
                phaseStartDate: assignmentStartDate.toISOString().split('T')[0]
            }));
        } else if (rawTasks && rawTasks.version === '2.0' && Array.isArray(rawTasks.phases)) {
            let cumulativeDays = 0;

            rawTasks.phases.forEach((phase, phaseIndex) => {
                const phaseStartDate = new Date(assignmentStartDate);
                phaseStartDate.setDate(phaseStartDate.getDate() + cumulativeDays);
                const phaseStartDateStr = phaseStartDate.toISOString().split('T')[0];

                if (Array.isArray(phase.tasks)) {
                    phase.tasks.forEach(task => {
                        templateTasks.push({
                            ...task,
                            phaseId: phase.id,
                            phaseName: phase.name,
                            phaseOrder: phaseIndex,
                            phaseDays: phase.days || 7,
                            phaseStartDate: phaseStartDateStr
                        });
                    });
                }

                cumulativeDays += (phase.days || 7);
            });
        }

        const todayStr = getTodayStr();

        const taskCreatePromises = templateTasks.map(taskData => {
            return prisma.task.create({
                data: {
                    userId,
                    title: taskData.title,
                    details: taskData.details || '',
                    type: taskData.type || 'binary',
                    category: taskData.category || 'star',
                    frequency: taskData.frequency || 'daily',
                    recurrence: taskData.recurrence || { type: 'daily', interval: 1, endType: 'never', weekDays: [], monthType: 'date', periodTarget: 1, dailyLimit: true },
                    reminder: taskData.reminder || { enabled: false, offset: 0 },
                    subtasks: taskData.subtasks || [],
                    dailyTarget: taskData.dailyTarget || 1,
                    unit: taskData.unit || '次',
                    stepValue: taskData.stepValue || 1,
                    date: taskData.phaseStartDate || todayStr,
                    time: taskData.time || '09:00',
                    assignmentId: assignment.id,
                    isLocked: true,
                    expertName: expert.name,
                    metadata: {
                        phaseId: taskData.phaseId,
                        phaseName: taskData.phaseName,
                        phaseOrder: taskData.phaseOrder,
                        phaseDays: taskData.phaseDays,
                        phaseStartDate: taskData.phaseStartDate
                    }
                }
            });
        });

        const createdTasks = await Promise.all(taskCreatePromises);

        return NextResponse.json({
            assignment,
            tasksCreated: createdTasks.length
        });

    } catch (error) {
        console.error('Create assignment error:', error);
        return NextResponse.json({ error: `指派失敗: ${error.message}` }, { status: 500 });
    }
}
