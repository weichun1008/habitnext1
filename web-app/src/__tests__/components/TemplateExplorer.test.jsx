import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateExplorer from '../../components/TemplateExplorer';

const FAMILIES = [
  { id: 'f1', slug: 'flower', title: '花朵計畫', intro: '週期分型 14 天', icon: 'Flower2', color: '#ec4899', quizPendingCopy: '花朵問卷開發中', order: 0, isActive: true },
  { id: 'f2', slug: 'sleep', title: '睡眠處方', intro: '睡眠卡點分型', icon: 'Moon', color: '#6366f1', quizPendingCopy: '睡眠問卷開發中', order: 1, isActive: true },
  { id: 'f3', slug: 'other', title: '其他公開計畫', intro: '各式主題', icon: 'LayoutGrid', color: '#10b981', quizPendingCopy: null, order: 2, isActive: true },
];
const TEMPLATES = [
  { id: 't1', name: '玫瑰 14 天', category: 'rose', description: '玫瑰課程', expert: { name: '王醫師', title: '營養師' }, _count: { tasks: 5, assignments: 3 } },
  { id: 't2', name: '壓力睡眠處方', category: 'sleep_stress', description: '睡眠課程', expert: { name: '李醫師', title: '醫師' }, _count: { tasks: 4, assignments: 1 } },
  { id: 't3', name: '通用減重', category: '健康生活', description: '通用課程', expert: { name: '陳教練', title: '教練' }, _count: { tasks: 6, assignments: 9 } },
];

function mockFetch() {
  global.fetch = jest.fn((url) => {
    let payload = [];
    if (url.includes('/api/templates/public')) payload = TEMPLATES;
    else if (url.includes('/api/plan-families')) payload = FAMILIES;
    else if (url.includes('/api/plan-categories')) payload = [];
    return Promise.resolve({ ok: true, json: async () => payload });
  });
}
afterEach(() => jest.restoreAllMocks());

describe('TemplateExplorer 兩層', () => {
  test('第一層渲染三個家族卡', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    expect(await screen.findByText('花朵計畫')).toBeInTheDocument();
    expect(screen.getByText('睡眠處方')).toBeInTheDocument();
    expect(screen.getByText('其他公開計畫')).toBeInTheDocument();
    expect(screen.queryByText('玫瑰 14 天')).toBeNull();
  });

  test('點花朵家族 → 第二層顯示該家族課程，不顯示他家族課程', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    fireEvent.click(await screen.findByText('花朵計畫'));
    expect(await screen.findByText('玫瑰 14 天')).toBeInTheDocument();
    expect(screen.queryByText('壓力睡眠處方')).toBeNull();
  });

  test('第二層返回鍵回到第一層', async () => {
    mockFetch();
    render(<TemplateExplorer isOpen onClose={() => {}} userId="u1" onJoin={() => {}} />);
    fireEvent.click(await screen.findByText('花朵計畫'));
    await screen.findByText('玫瑰 14 天');
    fireEvent.click(screen.getByLabelText('返回計畫家族'));
    expect(await screen.findByText('睡眠處方')).toBeInTheDocument();
  });
});
