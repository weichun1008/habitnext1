import React from 'react';
import { render, screen } from '@testing-library/react';
import FigureWorldView from '../../components/worlds/FigureWorldView';

describe('FigureWorldView', () => {
    const data = {
        count: 8,
        stage: { stage: 2, name: '幼體', min: 5 },
        progress: { stage: 2, name: '幼體', nextName: '成長期', remaining: 7 },
    };

    test('renders the creature, stage name, and progress text', () => {
        render(<FigureWorldView data={data} loading={false} />);
        expect(screen.getByLabelText('公仔夥伴')).toBeInTheDocument();
        expect(screen.getByText('幼體')).toBeInTheDocument();
        expect(screen.getByText(/再 7 次/)).toBeInTheDocument();
    });

    test('loading shows an animate-pulse skeleton', () => {
        const { container } = render(<FigureWorldView data={null} loading={true} />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    test('null data shows the friendly empty state with a stage-1 creature', () => {
        render(<FigureWorldView data={null} loading={false} />);
        expect(screen.getByLabelText('公仔夥伴')).toBeInTheDocument();
        expect(screen.getByText('完成習慣，你的夥伴會開始成長')).toBeInTheDocument();
    });
});
