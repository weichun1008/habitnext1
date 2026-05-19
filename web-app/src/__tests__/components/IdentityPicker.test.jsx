import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IdentityPicker from '../../components/explore/IdentityPicker';
import { USER_TYPE_PROFILES, GENERIC_IDENTITIES } from '../../lib/typeKeys';

describe('IdentityPicker', () => {
  it('renders the typeKey-derived recommendation with star marker when typeKey is set', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey="rose" />);
    expect(screen.getByText(USER_TYPE_PROFILES.rose.identity)).toBeInTheDocument();
    expect(screen.getByText(/推薦/)).toBeInTheDocument();
  });

  it('hides the recommendation chip when typeKey is null', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    expect(screen.queryByText(/推薦/)).not.toBeInTheDocument();
    GENERIC_IDENTITIES.forEach(s => expect(screen.getByText(s)).toBeInTheDocument());
  });

  it('calls onChange with the identity string when an option is clicked', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={null} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByText(GENERIC_IDENTITIES[0]));
    expect(onChange).toHaveBeenCalledWith(GENERIC_IDENTITIES[0]);
  });

  it('highlights the selected identity when value matches', () => {
    render(<IdentityPicker value={GENERIC_IDENTITIES[1]} onChange={() => {}} userTypeKey={null} />);
    const selected = screen.getByText(GENERIC_IDENTITIES[1]).closest('button');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });

  it('reveals text input when "自訂" is clicked and submits via Enter', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={null} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂身分/);
    fireEvent.change(input, { target: { value: '我是個全力以赴的人' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('我是個全力以赴的人');
  });

  it('truncates custom input to IDENTITY_MAX_LENGTH (40)', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    fireEvent.click(screen.getByText(/自訂/));
    const input = screen.getByPlaceholderText(/輸入自訂身分/);
    const long = 'a'.repeat(60);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(40);
  });
});
