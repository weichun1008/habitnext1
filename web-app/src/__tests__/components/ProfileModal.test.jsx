/**
 * ProfileModal Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileModal from '@/components/ProfileModal';

describe('ProfileModal', () => {
    const mockUser = {
        id: 'test-user-id',
        nickname: '測試用戶',
        phone: '0912345678',
    };

    const mockOnClose = jest.fn();
    const mockOnUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('renders correctly when open', () => {
        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('個人資料')).toBeInTheDocument();
        expect(screen.getByDisplayValue('測試用戶')).toBeInTheDocument();
        expect(screen.getByDisplayValue('0912345678')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <ProfileModal
                isOpen={false}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.queryByText('個人資料')).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', async () => {
        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        const cancelButton = screen.getByText('取消');
        await userEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('allows editing nickname', async () => {
        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        const nicknameInput = screen.getByDisplayValue('測試用戶');
        await userEvent.clear(nicknameInput);
        await userEvent.type(nicknameInput, '新暱稱');

        expect(nicknameInput).toHaveValue('新暱稱');
    });

    it('shows password fields when "修改密碼" is clicked', async () => {
        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        const changePasswordButton = screen.getByText('修改密碼');
        await userEvent.click(changePasswordButton);

        expect(screen.getByPlaceholderText('輸入舊密碼')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('輸入新密碼（至少 6 字元）')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: '新密碼與確認密碼不一致' }),
        });

        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        // Open password change
        await userEvent.click(screen.getByText('修改密碼'));

        // Fill passwords
        await userEvent.type(screen.getByPlaceholderText('輸入舊密碼'), 'oldpass');
        await userEvent.type(screen.getByPlaceholderText('輸入新密碼（至少 6 字元）'), 'newpass1');
        await userEvent.type(screen.getByPlaceholderText('再次輸入新密碼'), 'newpass2'); // Different

        // Try to save
        await userEvent.click(screen.getByText('儲存'));

        // Should show error
        await waitFor(() => {
            expect(screen.getByText('新密碼與確認密碼不一致')).toBeInTheDocument();
        });
    });

    it('calls API and updates user on successful save', async () => {
        const updatedUser = { ...mockUser, nickname: '新暱稱' };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ user: updatedUser }),
        });

        render(
            <ProfileModal
                isOpen={true}
                onClose={mockOnClose}
                user={mockUser}
                onUpdate={mockOnUpdate}
            />
        );

        // Change nickname
        const nicknameInput = screen.getByDisplayValue('測試用戶');
        await userEvent.clear(nicknameInput);
        await userEvent.type(nicknameInput, '新暱稱');

        // Save
        await userEvent.click(screen.getByText('儲存'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', expect.any(Object));
        });
    });
});
