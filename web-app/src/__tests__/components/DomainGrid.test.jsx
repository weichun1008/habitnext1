import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DomainGrid from '../../components/explore/DomainGrid';

const categories = [
  { id: '1', name: '飲食',   icon: 'Utensils', color: '#F97316', order: 3 },
  { id: '2', name: '運動',   icon: 'Dumbbell', color: '#EF4444', order: 4 },
  { id: '3', name: '心靈',   icon: 'Sparkles', color: '#0EA5E9', order: 7 },
];

describe('DomainGrid', () => {
  it('renders one card per category, sorted by order', () => {
    render(<DomainGrid categories={categories} onSelect={() => {}} />);
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('飲食');
    expect(cards[1]).toHaveTextContent('運動');
    expect(cards[2]).toHaveTextContent('心靈');
  });

  it('calls onSelect with the category when a card is clicked', () => {
    const onSelect = jest.fn();
    render(<DomainGrid categories={categories} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('運動'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: '運動' }));
  });

  it('renders nothing meaningful when categories array is empty', () => {
    const { container } = render(<DomainGrid categories={[]} onSelect={() => {}} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
