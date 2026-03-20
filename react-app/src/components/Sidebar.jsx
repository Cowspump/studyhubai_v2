import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getInitials } from '../utils/helpers';
import LanguageSwitcher from './LanguageSwitcher';

export default function Sidebar({ links, adminUser, onAdminLogout, unreadCount = 0 }) {
  const auth = useAuth();
  const { t } = useLang();

  const isAdmin = !!adminUser;
  const user = isAdmin ? adminUser : auth.user;
  const handleLogout = isAdmin ? onAdminLogout : auth.logout;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {user.photo ? (
          <img
            src={user.photo}
            className="avatar"
            alt={t('photo')}
            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          <div className="avatar-initials">{getInitials(user.name)}</div>
        )}
        <h3>{user.name}</h3>
        <p className={`role-badge ${user.role === 'student' ? 'student-badge' : ''} ${user.role === 'superadmin' ? 'admin-badge' : ''}`}>
          {user.role === 'superadmin' ? t('superadmin') : user.role === 'teacher' ? t('teacher') : user.group_name || t('student')}
        </p>
      </div>

      <LanguageSwitcher />

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {link.label}
            {link.showUnread && unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  marginLeft: 4,
                }}
              >
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button className="btn btn-logout" onClick={handleLogout}>
        {t('logout')}
      </button>
    </aside>
  );
}
