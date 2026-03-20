import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { studentApi } from '../../utils/api';

export default function StudentHome() {
  const { user } = useAuth();
  const { t } = useLang();
  const [profile, setProfile] = useState(null);
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileData, teacherData] = await Promise.all([
          studentApi.getProfile(),
          studentApi.getTeacher(),
        ]);
        setProfile(profileData);
        setTeacher(teacherData);
      } catch { /* ignore */ }
    }
    load();
  }, []);

  if (!profile) return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</p>;

  return (
    <>
      <h2>{t('welcome')}, {user.name.split(' ')[0]}!</h2>

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
