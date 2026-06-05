import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddFlowChooser from '../../components/AddFlowChooser';

describe('AddFlowChooser', () => {
  it('關閉時不渲染', () => {
    const { container } = render(<AddFlowChooser isOpen={false} onClose={()=>{}} onAspiration={()=>{}} onExplore={()=>{}} onLibrary={()=>{}} />);
    expect(container.firstChild).toBeNull();
  });
  it('三條路徑各自觸發 callback', () => {
    const onAspiration = jest.fn(), onExplore = jest.fn(), onLibrary = jest.fn();
    render(<AddFlowChooser isOpen onClose={()=>{}} onAspiration={onAspiration} onExplore={onExplore} onLibrary={onLibrary} />);
    fireEvent.click(screen.getByText('從嚮往開始'));
    fireEvent.click(screen.getByText('探索計畫'));
    fireEvent.click(screen.getByText('瀏覽習慣庫'));
    expect(onAspiration).toHaveBeenCalledTimes(1);
    expect(onExplore).toHaveBeenCalledTimes(1);
    expect(onLibrary).toHaveBeenCalledTimes(1);
  });
});
