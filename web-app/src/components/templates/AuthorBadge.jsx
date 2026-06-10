'use client';

import React from 'react';
import { Users, BadgeCheck } from 'lucide-react';
import { useT } from '@/lib/i18n';

// AuthorBadge — 標示計畫是「官方」或「用戶自創 · by 作者」。
// 只在 template.authorType 明確設定（'user' | 'official'）時才渲染；
// 未設定時保持靜默，不破壞不帶 authorType 的舊資料。
const AuthorBadge = ({ template }) => {
  const { t } = useT();
  if (!template || !template.authorType) return null;
  if (template.authorType === 'user') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200">
        <Users size={11} /> {t('templates.communityAuthor')}{template.authorName ? ` · by ${template.authorName}` : ''}
      </span>
    );
  }
  if (template.authorType === 'official') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
        <BadgeCheck size={11} /> {t('templates.officialAuthor')}{template.expert?.name ? ` · ${template.expert?.name}` : ''}
      </span>
    );
  }
  return null;
};

export default AuthorBadge;
