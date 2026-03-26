import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { studentApi } from '../../utils/api';

export default function StudentHome() {
  const { user } = useAuth();
  const { t } = useLang();
  const [profile, setProfile] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      const [profileResult, teacherResult] = await Promise.allSettled([
        studentApi.getProfile(),
        studentApi.getTeacher(),
      ]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        setProfile({
          group_name: user?.group_name || '',
          available_tests: 0,
          submitted: 0,
          average: 0,
        });
        setLoadError(t('infoUnavailable'));
      }

      if (teacherResult.status === 'fulfilled') {
        setTeacher(teacherResult.value);
      } else {
        setTeacher(null);
      }
    }
    load();
  }, [t, user]);

  if (!profile) return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</p>;

  const firstName = (user?.name || '').trim().split(' ').filter(Boolean)[0] || t('student');

  return (
    <>
      <h2>{t('welcome')}, {firstName}!</h2>
      {loadError && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: '#92400e' }}>{loadError}</p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-num">{profile.group_name || '—'}</span>
          <span className="stat-label">{t('group')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{profile.available_tests}</span>
          <span className="stat-label">{t('availableTests')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{profile.submitted}</span>
          <span className="stat-label">{t('submitted')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{profile.average}%</span>
          <span className="stat-label">{t('average')}</span>
        </div>
      </div>

      <div className="card">
        <h3>{t('teacherInfo')}</h3>
        {teacher ? (
          <div className="profile-info">
            <img
              src={teacher.photo || '/src/assets/placeholder.svg'}
              className="avatar-lg"
              alt={t('photo')}
              style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 12 }}
            />
            <div>
              <p><strong>{teacher.name}</strong></p>
              <p>{teacher.position || ''}</p>
              <p>{teacher.bio || ''}</p>
              <p>{t('email')}: <a href={`mailto:${teacher.email}`}>{teacher.email}</a></p>
              <p>{t('phone')}: {teacher.phone || '—'}</p>
              <p>{t('telegram')}: {teacher.telegram || '—'}</p>
            </div>
          </div>
        ) : (
          <p>{t('infoUnavailable')}</p>
        )}
      </div>
    </>
  );
}
