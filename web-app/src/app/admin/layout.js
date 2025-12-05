import './admin.css';

export const metadata = {
    title: '專家後台 | 習慣管理系統',
    description: '專家模板管理後台',
};

export default function AdminLayout({ children }) {
    return (
        <div className="admin-layout">
            {children}
        </div>
    );
}
