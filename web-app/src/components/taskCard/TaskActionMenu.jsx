'use client';

import React from 'react';
import { Pause, EyeOff, Trash2 } from 'lucide-react';

// TaskActionMenu — shared component rendered in 3 contexts:
//   1. Mobile swipe-reveal (right side of card, shows [pause, delete] only)
//   2. Desktop hover popover (drop-down from ⋮, shows all 3)
//   3. TaskDetailModal footer (row of 3 buttons)
//
// Variants are controlled by the `variant` prop, but the underlying actions
// are identical: PATCH /api/tasks/:id with the new status (paused / archived)
// or DELETE for hard delete. Confirm dialogs use the strings in spec §9.
//
// Props:
//   taskId, taskTitle (for confirm copy)
//   variant: 'swipe' | 'popover' | 'detail-footer'
//   onAction(action, success): notified after the API call resolves;
//     action ∈ 'paused' | 'archived' | 'deleted'; success: boolean
const CONFIRM_TEXT = {
    paused:   '暫停這個習慣？暫停期間不會出現在今日行程。',
    archived: '隱藏這個習慣？之後不會再看到。',
    deleted:  '確定要永久刪除這個習慣嗎？所有歷史紀錄也會一起消失。',
};

const TaskActionMenu = ({ taskId, taskTitle, variant = 'popover', onAction }) => {
    const handle = async (action) => {
        if (!window.confirm(CONFIRM_TEXT[action])) return;
        try {
            let res;
            if (action === 'deleted') {
                res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            } else {
                // 'paused' or 'archived' — PUT a partial update with just status
                res = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: action }),
                });
            }
            onAction?.(action, res.ok);
            if (!res.ok) {
                window.alert(`操作失敗（${action}），請稍後再試`);
            }
        } catch (e) {
            console.error('TaskActionMenu action error', e);
            onAction?.(action, false);
            window.alert('發生錯誤');
        }
    };

    // Swipe variant: 2 buttons inline (pause + delete), no hide
    if (variant === 'swipe') {
        return (
            <div className="flex items-stretch h-full">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handle('paused'); }}
                    className="flex flex-col items-center justify-center px-4 bg-amber-500 text-white text-xs font-bold gap-1"
                    aria-label={`暫停 ${taskTitle}`}
                >
                    <Pause size={16} />
                    暫停
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handle('deleted'); }}
                    className="flex flex-col items-center justify-center px-4 bg-red-500 text-white text-xs font-bold gap-1 rounded-r-2xl"
                    aria-label={`刪除 ${taskTitle}`}
                >
                    <Trash2 size={16} />
                    刪除
                </button>
            </div>
        );
    }

    // Detail-footer variant: 3 horizontal buttons spanning the modal width
    if (variant === 'detail-footer') {
        return (
            <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50">
                <button
                    type="button"
                    onClick={() => handle('paused')}
                    className="flex-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                >
                    <Pause size={14} /> 暫停
                </button>
                <button
                    type="button"
                    onClick={() => handle('archived')}
                    className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                    <EyeOff size={14} /> 隱藏
                </button>
                <button
                    type="button"
                    onClick={() => handle('deleted')}
                    className="flex-1 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                    <Trash2 size={14} /> 刪除
                </button>
            </div>
        );
    }

    // Popover variant (desktop hover): vertical list, divider before delete
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('paused'); }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors"
            >
                <Pause size={14} /> 暫停
            </button>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('archived'); }}
                className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
                <EyeOff size={14} /> 隱藏
            </button>
            <div className="h-px bg-gray-100" />
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handle('deleted'); }}
                className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
                <Trash2 size={14} /> 刪除
            </button>
        </div>
    );
};

export default TaskActionMenu;
