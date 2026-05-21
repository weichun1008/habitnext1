/**
 * TemplateDetailPanel tests — Slice J
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import TemplateDetailPanel from '@/components/TemplateDetailPanel';

const baseTemplate = {
    id: 'tpl-rose',
    name: '玫瑰型小課程',
    description: '玫瑰型適合在週期前後做溫和的內外調節。',
    category: 'rose',
    expert: { id: 'exp-1', name: 'Dr. Lin', title: '婦產科醫師' },
    _count: { assignments: 12, tasks: 28 },
    tasks: {
        version: '2.0',
        phases: [
            {
                id: 'L1',
                name: 'L1 入門 — 微習慣起步',
                days: 7,
                tasks: [
                    { title: '早上喝兩大口水（200cc）' },
                    { title: '上完廁所後伸展 10 分鐘' },
                ],
            },
            {
                id: 'L2',
                name: 'L2 進階 — 加入第二個錨點',
                days: 4,
                tasks: [{ title: '午餐後散步 5 分鐘' }],
            },
        ],
    },
};

describe('TemplateDetailPanel', () => {
    beforeEach(() => {
        // requestAnimationFrame stub for jsdom
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => {
            cb();
            return 1;
        });
        jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders name, description, expert, summary, and all phase tasks', () => {
        render(<TemplateDetailPanel template={baseTemplate} onBack={jest.fn()} onJoin={jest.fn()} />);

        expect(screen.getByText('玫瑰型小課程')).toBeInTheDocument();
        expect(screen.getByText(/玫瑰型適合在週期前後/)).toBeInTheDocument();
        expect(screen.getByText('婦產科醫師')).toBeInTheDocument();
        expect(screen.getByText(/Dr. Lin/)).toBeInTheDocument();

        // Phase headers
        expect(screen.getByText('L1 入門 — 微習慣起步')).toBeInTheDocument();
        expect(screen.getByText('L2 進階 — 加入第二個錨點')).toBeInTheDocument();
        expect(screen.getByText('7 天')).toBeInTheDocument();
        expect(screen.getByText('4 天')).toBeInTheDocument();

        // Tasks
        expect(screen.getByText('早上喝兩大口水（200cc）')).toBeInTheDocument();
        expect(screen.getByText('上完廁所後伸展 10 分鐘')).toBeInTheDocument();
        expect(screen.getByText('午餐後散步 5 分鐘')).toBeInTheDocument();

        // Summary stats (3 phases would compute totalDays=11, totalTasks=3, assignments=12)
        expect(screen.getByText('3')).toBeInTheDocument();   // totalTasks
        expect(screen.getByText('11')).toBeInTheDocument();  // totalDays
        expect(screen.getByText('12')).toBeInTheDocument();  // assignments
    });

    test('shows 為你推薦 badge when isRecommended', () => {
        render(<TemplateDetailPanel template={baseTemplate} isRecommended={true} onBack={jest.fn()} onJoin={jest.fn()} />);
        expect(screen.getByText('為你推薦')).toBeInTheDocument();
    });

    test('hides 為你推薦 badge when not recommended', () => {
        render(<TemplateDetailPanel template={baseTemplate} isRecommended={false} onBack={jest.fn()} onJoin={jest.fn()} />);
        expect(screen.queryByText('為你推薦')).not.toBeInTheDocument();
    });

    test('legacy template without phases shows the fallback notice', () => {
        const legacy = { ...baseTemplate, tasks: { version: '1.0' } };
        render(<TemplateDetailPanel template={legacy} onBack={jest.fn()} onJoin={jest.fn()} />);
        expect(screen.getByText(/任務結構為舊版/)).toBeInTheDocument();
    });

    test('clicking 返回 fires onBack after the slide-out delay', () => {
        jest.useFakeTimers();
        const onBack = jest.fn();
        render(<TemplateDetailPanel template={baseTemplate} onBack={onBack} onJoin={jest.fn()} />);

        fireEvent.click(screen.getByLabelText('返回'));
        expect(onBack).not.toHaveBeenCalled();   // animation delay first
        act(() => jest.runAllTimers());
        expect(onBack).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    test('clicking 加入計畫 fires onJoin with the template', () => {
        const onJoin = jest.fn();
        render(<TemplateDetailPanel template={baseTemplate} onBack={jest.fn()} onJoin={onJoin} />);

        fireEvent.click(screen.getByText('加入計畫'));
        expect(onJoin).toHaveBeenCalledWith(baseTemplate);
    });

    test('join button is disabled and shows "加入中…" when joining=true', () => {
        render(<TemplateDetailPanel template={baseTemplate} joining={true} onBack={jest.fn()} onJoin={jest.fn()} />);
        const btn = screen.getByText('加入中…').closest('button');
        expect(btn).toBeDisabled();
    });

    test('renders null when template is missing', () => {
        const { container } = render(<TemplateDetailPanel template={null} onBack={jest.fn()} onJoin={jest.fn()} />);
        expect(container.firstChild).toBeNull();
    });
});
