import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IdentityPicker from '../../components/explore/IdentityPicker';
import { USER_TYPE_PROFILES, GENERIC_IDENTITIES } from '../../lib/typeKeys';

describe('IdentityPicker — recommendations', () => {
  it('renders the typeKey-derived recommendation with star marker when typeKey is set', () => {
    const { container } = render(<IdentityPicker value={null} onChange={() => {}} userTypeKey="rose" />);
    expect(screen.getByText(USER_TYPE_PROFILES.rose.identity)).toBeInTheDocument();
    expect(container.querySelector('.text-amber-700')).toHaveTextContent('推薦');
  });

  it('hides the recommendation chip when typeKey is null', () => {
    const { container } = render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    expect(container.querySelector('.text-amber-700')).toBeNull();
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
    // getByText would match the pill's <span> + the button text; restrict to
    // role=button to land on the IdentityButton.
    const selected = screen.getByRole('button', { name: GENERIC_IDENTITIES[1] });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('IdentityPicker — selected pill + toggle off', () => {
  it('renders 目前身分 pill when value is set', () => {
    render(<IdentityPicker value={GENERIC_IDENTITIES[0]} onChange={() => {}} userTypeKey={null} />);
    const pill = screen.getByTestId('identity-selected-pill');
    expect(pill).toHaveTextContent('目前身分');
    expect(pill).toHaveTextContent(GENERIC_IDENTITIES[0]);
  });

  it('does not render pill when value is falsy', () => {
    render(<IdentityPicker value={null} onChange={() => {}} userTypeKey={null} />);
    expect(screen.queryByTestId('identity-selected-pill')).not.toBeInTheDocument();
  });

  it('renders pill even when value is a custom string not in any preset', () => {
    render(<IdentityPicker value="我是個全力以赴的人" onChange={() => {}} userTypeKey={null} />);
    expect(screen.getByTestId('identity-selected-pill')).toHaveTextContent('我是個全力以赴的人');
  });

  it('calls onChange("") when the pill clear button is clicked', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={GENERIC_IDENTITIES[0]} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByLabelText('清除身分'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('toggles off when the already-selected preset is clicked again', () => {
    const onChange = jest.fn();
    render(<IdentityPicker value={GENERIC_IDENTITIES[0]} onChange={onChange} userTypeKey={null} />);
    fireEvent.click(screen.getByRole('button', { name: GENERIC_IDENTITIES[0] }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('toggles off the recommended identity when clicked while selected', () => {
    const onChange = jest.fn();
    const recommended = USER_TYPE_PROFILES.rose.identity;
    render(<IdentityPicker value={recommended} onChange={onChange} userTypeKey="rose" />);
    // Same role=button scope as above; the recommended IdentityButton's
    // accessible name includes the "推薦" Sparkles badge, so match the label
    // as a substring instead of requiring an exact name match.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(recommended) }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('IdentityPicker — custom input', () => {
  it('reveals text input when 自訂 is clicked and submits via Enter', () => {
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
