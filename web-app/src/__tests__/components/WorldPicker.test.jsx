import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorldPicker from '../../components/WorldPicker';

describe('WorldPicker', () => {
    test('renders all 3 world cards', () => {
        const { container } = render(
            <WorldPicker activeWorld={null} onSelectWorld={() => {}} onEnterWorld={() => {}} />
        );
        expect(container.querySelectorAll('[data-world]')).toHaveLength(3);
    });

    test('home shows the 即將推出 badge; journey and figure do not', () => {
        const { container } = render(
            <WorldPicker activeWorld={null} onSelectWorld={() => {}} onEnterWorld={() => {}} />
        );
        const home = container.querySelector('[data-world="home"]');
        const figure = container.querySelector('[data-world="figure"]');
        const journey = container.querySelector('[data-world="journey"]');
        expect(home.textContent).toContain('即將推出');
        expect(figure.textContent).not.toContain('即將推出');
        expect(journey.textContent).not.toContain('即將推出');
    });

    test('clicking the journey enter button calls onEnterWorld("journey")', () => {
        const onEnterWorld = jest.fn();
        render(
            <WorldPicker activeWorld={null} onSelectWorld={() => {}} onEnterWorld={onEnterWorld} />
        );
        fireEvent.click(screen.getByText('進入旅程世界'));
        expect(onEnterWorld).toHaveBeenCalledWith('journey');
    });

    test('clicking the figure enter button calls onEnterWorld("figure")', () => {
        const onEnterWorld = jest.fn();
        render(
            <WorldPicker activeWorld={null} onSelectWorld={() => {}} onEnterWorld={onEnterWorld} />
        );
        fireEvent.click(screen.getByText('進入公仔世界'));
        expect(onEnterWorld).toHaveBeenCalledWith('figure');
    });

    test('clicking the home select button calls onSelectWorld with "home"', () => {
        const onSelectWorld = jest.fn();
        const { container } = render(
            <WorldPicker activeWorld={null} onSelectWorld={onSelectWorld} onEnterWorld={() => {}} />
        );
        const homeBtn = container.querySelector('[data-world="home"] button');
        fireEvent.click(homeBtn);
        expect(onSelectWorld).toHaveBeenCalledWith('home');
    });

    test('the active world card shows 目前所在 / 已選定', () => {
        const { container } = render(
            <WorldPicker activeWorld="home" onSelectWorld={() => {}} onEnterWorld={() => {}} />
        );
        const home = container.querySelector('[data-world="home"]');
        expect(home.textContent).toContain('目前所在');
        expect(home.textContent).toContain('已選定');
    });
});
