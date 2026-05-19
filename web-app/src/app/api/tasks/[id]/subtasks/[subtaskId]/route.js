import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeChecklistValue } from '@/lib/subtasks';

// DELETE /api/tasks/:id/subtasks/:subtaskId?mode=hide|permanent
//   mode=hide      → soft-delete: set removedAt = today on the subtask
//   mode=permanent → hard-delete: remove from subtasks AND clear from all TaskHistory.subtaskCompletions
export async function DELETE(request, { params }) {
  try {
    const { id: taskId, subtaskId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'hide';
    if (!['hide', 'permanent'].includes(mode)) {
      return NextResponse.json({ error: 'mode must be hide or permanent' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { history: true } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    if (!subtasks.some(s => s.id === subtaskId)) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    if (mode === 'hide') {
      const newSubtasks = subtasks.map(s =>
        s.id === subtaskId ? { ...s, removedAt: todayStr } : s
      );
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { subtasks: newSubtasks },
      });
      return NextResponse.json({ task: updated, mode: 'hide' });
    }

    // mode === 'permanent'
    const newSubtasks = subtasks.filter(s => s.id !== subtaskId);

    // Cascade clear from all TaskHistory entries
    const histories = await prisma.taskHistory.findMany({ where: { taskId } });
    for (const h of histories) {
      if (!h.subtaskCompletions || typeof h.subtaskCompletions !== 'object') continue;
      if (!(subtaskId in h.subtaskCompletions)) continue;
      const { [subtaskId]: _drop, ...rest } = h.subtaskCompletions;
      const newValue = computeChecklistValue(rest);
      const target = task.dailyTarget || newSubtasks.length;
      const newCompleted = newValue >= target;
      await prisma.taskHistory.update({
        where: { id: h.id },
        data: { subtaskCompletions: rest, value: newValue, completed: newCompleted },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { subtasks: newSubtasks },
    });
    return NextResponse.json({ task: updated, mode: 'permanent' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
