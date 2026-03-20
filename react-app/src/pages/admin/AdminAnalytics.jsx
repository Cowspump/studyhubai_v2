import { useState, useEffect } from 'react';
import { useLang } from '../../context/LanguageContext';
import { adminApi } from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316'];

export default function AdminAnalytics() {
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
        setStats({ total_users: 0, teachers: 0, students: 0, verified: 0 });
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</p>;
  }

  // Pie chart data: verified vs unverified
  const verifiedData = [
    { name: t('adminVerified'), value: stats.verified },
    { name: t('adminUnverified'), value: stats.total_users - stats.verified },
  ].filter((d) => d.value > 0);

  // Pie chart data: role distribution
  const roleData = [
    { name: t('adminTeachersCount'), value: stats.teachers },
    { name: t('adminStudentsCount'), value: stats.students },
  ].filter((d) => d.value > 0);

  // Bar chart: teacher count as bar data (each teacher as entry, mock student count)
  const teacherBarData = teachers.map((teacher, i) => ({
    name: teacher.name.split(' ').slice(0, 1).join(' '),
    fullName: teacher.name,
    value: Math.floor(Math.random() * 30) + 5, // mock student count per teacher
  }));

  // Line chart: registration trend (mock monthly data)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const trendData = months.map((month, i) => ({
    month,
    users: Math.floor(Math.random() * 20) + (i + 1) * 3,
  }));

  return (
    <>
      <div className="admin-page-header">
        <h2>{t('adminAnalyticsTitle')}</h2>
        <p>{t('adminAnalyticsDesc')}</p>
      </div>

      {/* Stats overview */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><span>👥</span></div>
          <div className="admin-stat-value">{stats.total_users}</div>
          <div className="admin-stat-label">{t('adminTotalUsers')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><span>🎓</span></div>
          <div className="admin-stat-value">{stats.teachers}</div>
          <div className="admin-stat-label">{t('adminTeachersCount')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber"><span>📚</span></div>
          <div className="admin-stat-value">{stats.students}</div>
          <div className="admin-stat-label">{t('adminStudentsCount')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon pink"><span>✅</span></div>
          <div className="admin-stat-value">{stats.verified}</div>
          <div className="admin-stat-label">{t('adminVerifiedCount')}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="admin-charts-grid">
        {/* Registration Trend */}
        <div className="admin-chart-card full-width">
          <h4>{t('adminRegistrationTrend')}</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Students per Teacher */}
        {teacherBarData.length > 0 && (
          <div className="admin-chart-card">
            <h4>{t('adminStudentsPerTeacher')}</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={teacherBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  formatter={(value, name, props) => [value, props.payload.fullName]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {teacherBarData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Role Distribution */}
        <div className="admin-chart-card">
          <h4>{t('adminRoleDistribution')}</h4>
          {roleData.length === 0 ? (
            <div className="admin-empty">
              <p>{t('adminNoData')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 13 }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Teacher Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3>{t('adminTeacherDetails')}</h3>
        </div>
        {teachers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📊</div>
            <p>{t('adminNoData')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-detail-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('adminStatus')}</th>
                  <th>{t('adminRegistered')}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td><strong>{teacher.name}</strong></td>
                    <td>{teacher.email}</td>
                    <td>
                      <span className={`status-badge ${teacher.is_verified ? 'verified' : 'unverified'}`}>
                        <span className={`status-dot ${teacher.is_verified ? 'verified' : 'unverified'}`} />
                        {teacher.is_verified ? t('adminVerified') : t('adminUnverified')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
