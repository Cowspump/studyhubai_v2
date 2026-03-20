import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useLang } from '../../context/LanguageContext';
import { setAdminToken } from '../../utils/api';
import AdminLogin from './AdminLogin';
import AdminHome from './AdminHome';
import AdminTeachers from './AdminTeachers';
import AdminAnalytics from './AdminAnalytics';
import '../../styles/admin.css';

export default function AdminDashboard() {
  const { t } = useLang();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_session');
    if (saved) {
      try { setAdmin(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogin = (adminUser) => {
    sessionStorage.setItem('admin_session', JSON.stringify(adminUser));
    setAdmin(adminUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    setAdminToken(null);
    setAdmin(null);
  };

  if (!admin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const links = [
    { to: '/admin', label: t('adminNavHome'), end: true },
    { to: '/admin/teachers', label: t('adminNavTeachers') },
    { to: '/admin/analytics', label: t('adminNavAnalytics') },
  ];

  return (
    <div className="dashboard">
      <Sidebar links={links} adminUser={admin} onAdminLogout={handleLogout} />
      <main className="main-content" style={{ maxWidth: 1200 }}>
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Routes>
      </main>
    </div>
  );
}
