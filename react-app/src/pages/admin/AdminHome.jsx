import { useState, useEffect } from 'react';
import { useLang } from '../../context/LanguageContext';
import { adminApi } from '../../utils/api';
import Spinner from '../../components/Spinner';

export default function AdminHome() {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, teachersData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getTeachers(),
        ]);
        setStats(statsData);
        setTeachers(teachersData);
      } catch {
        // If API unavailable, show zeros
        setStats({ total_users: 0, teachers: 0, students: 0, verified: 0 });
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="admin-page-header">
        <h2>{t('adminPanel')}</h2>
        <p>{t('adminPanelDesc')}</p>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple">
            <span>👥</span>
          </div>
          <div className="admin-stat-value">{stats.total_users}</div>
          <div className="admin-stat-label">{t('adminTotalUsers')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <span>🎓</span>
          </div>
          <div className="admin-stat-value">{stats.teachers}</div>
          <div className="admin-stat-label">{t('adminTeachersCount')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <span>📚</span>
          </div>
          <div className="admin-stat-value">{stats.students}</div>
          <div className="admin-stat-label">{t('adminStudentsCount')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon pink">
            <span>✅</span>
          </div>
          <div className="admin-stat-value">{stats.verified}</div>
          <div className="admin-stat-label">{t('adminVerifiedCount')}</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3>{t('adminRecentTeachers')}</h3>
        </div>
        {teachers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📋</div>
            <p>{t('adminNoTeachers')}</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('email')}</th>
                <th>{t('adminStatus')}</th>
                <th>{t('date')}</th>
              </tr>
            </thead>
            <tbody>
              {teachers.slice(0, 5).map((teacher) => (
                <tr key={teacher.id}>
                  <td><strong>{teacher.name}</strong></td>
                  <td>{teacher.email}</td>
                  <td>
                    <span className={`status-badge ${teacher.is_verified ? 'verified' : 'unverified'}`}>
                      <span className={`status-dot ${teacher.is_verified ? 'verified' : 'unverified'}`} />
                      {teacher.is_verified ? t('adminVerified') : t('adminUnverified')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
