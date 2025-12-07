import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayStr } from '@/lib/utils';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const assignments = await prisma.assignment.findMany({
            where: { userId },
            include: {
                template: true,
                expert: {
                    select: { name: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('Fetch user assignments error:', error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, templateId, startDate: requestedStartDate } = body;
        console.log('[API] Join Plan Request:', { userId, templateId, requestedStartDate });

        if (!userId || !templateId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get template details
        const template = await prisma.template.findUnique({
            where: { id: templateId },
            include: { expert: true }
        });

        if (!template) {
            console.error('[API] Template not found:', templateId);
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Handle both legacy (flat array) and new 3-layer structure (Plan > Phase > Task)
        let tasksData = [];
        const rawTasks = template.tasks;
        // Use user-provided start date, or fixed date from template, or default to today
        const startDate = requestedStartDate
            ? new Date(requestedStartDate)
            : (template.fixedStartDate ? template.fixedStartDate : new Date());

        if (Array.isArray(rawTasks)) {
            // Legacy format: flat array of tasks
            tasksData = rawTasks.map(task => ({
                ...task,
                phaseName: null,
                phaseOrder: 0,
                phaseStartDate: startDate.toISOString().split('T')[0]
            }));
        } else if (rawTasks && rawTasks.version === '2.0' && Array.isArray(rawTasks.phases)) {
            // New 3-layer format: extract tasks from all phases with calculated start dates
            let cumulativeDays = 0;

            rawTasks.phases.forEach((phase, phaseIndex) => {
                // Calculate this phase's start date
                const phaseStartDate = new Date(startDate);
                phaseStartDate.setDate(phaseStartDate.getDate() + cumulativeDays);
                const phaseStartDateStr = phaseStartDate.toISOString().split('T')[0];

                if (Array.isArray(phase.tasks)) {
                    phase.tasks.forEach(task => {
                        tasksData.push({
                            ...task,
                            phaseId: phase.id,
                            phaseName: phase.name,
                            phaseOrder: phaseIndex,
                            phaseDays: phase.days || 7,
                            phaseStartDate: phaseStartDateStr
                        });
                    });
                }

                // Add this phase's days to cumulative total
                cumulativeDays += (phase.days || 7);
            });
        }

        console.log('[API] Template Tasks to copy:', tasksData.length);

        // Create Assignment
        const result = await prisma.$transaction(async (tx) => {
            const assignment = await tx.assignment.create({
                data: {
                    userId,
                    templateId,
                    expertId: template.expertId,
                    status: 'active',
                    startDate: startDate,
                }
            });
            console.log('[API] Assignment Created:', assignment.id);

            // Create Tasks for User
            if (tasksData.length > 0) {
                await tx.task.createMany({
                    data: tasksData.map(t => {
                        // Calculate task end date based on phase duration (Phase Priority Rule)
                        const taskStartDate = new Date(t.phaseStartDate || getTodayStr());
                        const phaseDays = t.phaseDays || 7;
                        const taskEndDate = new Date(taskStartDate);
                        taskEndDate.setDate(taskEndDate.getDate() + phaseDays - 1);
                        const endDateStr = taskEndDate.toISOString().split('T')[0];

                        // Override recurrence end settings with phase-based end date
                        const recurrence = {
                            ...(t.recurrence || {}),
                            endType: 'date',
                            endDate: endDateStr
                        };

                        return {
                            userId,
                            title: t.title,
                            details: t.details || '',
                            type: t.type || 'binary',
                            frequency: t.frequency || 'daily',
                            time: '09:00',
                            category: t.category || 'star',
                            dailyTarget: t.dailyTarget || 1,
                            unit: t.unit || '次',
                            stepValue: t.stepValue || 1,
                            subtasks: t.subtasks || [],
                            recurrence: recurrence,
                            reminder: {},
                            createdAt: new Date(),
                            date: t.phaseStartDate || getTodayStr(),
                            assignmentId: assignment.id,
                            expertName: template.expert?.name || 'Unknown',
                            isLocked: false,
                            // Phase info stored in metadata JSON field
                            metadata: {
                                phaseId: t.phaseId,
                                phaseName: t.phaseName,
                                phaseOrder: t.phaseOrder,
                                phaseDays: t.phaseDays,
                                phaseStartDate: t.phaseStartDate,
                                phaseEndDate: endDateStr
                            }
                        };
                    })
                });
            }

            return assignment;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Create assignment error:', error);
        return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }
}
