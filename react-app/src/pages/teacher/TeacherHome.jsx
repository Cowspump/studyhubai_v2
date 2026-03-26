import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { teacherApi } from '../../utils/api';

export default function TeacherHome() {
  const { user, updateUser } = useAuth();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [apiKey, setApiKeyState] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [stats, setStats] = useState({ groups: 0, students: 0, tests: 0, results: 0 });
  const [rating, setRating] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      const [profileResult, statsResult, ratingResult, keyResult] = await Promise.allSettled([
        teacherApi.getProfile(),
        teacherApi.getStats(),
        teacherApi.getRating(),
        teacherApi.getApiKey(),
      ]);

      const fallbackProfile = {
        name: user?.name || '',
        email: user?.email || '',
        photo: user?.photo || '',
        position: '',
        phone: '',
        telegram: '',
        bio: '',
      };

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
        setForm(profileResult.value);
      } else {
        setProfile(fallbackProfile);
        setForm(fallbackProfile);
        setLoadError(t('infoUnavailable'));
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value || { groups: 0, students: 0, tests: 0, results: 0 });
      }

      if (ratingResult.status === 'fulfilled') {
        setRating(Array.isArray(ratingResult.value) ? ratingResult.value : []);
      }

      if (keyResult.status === 'fulfilled') {
        const value = keyResult.value?.openai_key || '';
        setApiKeyState(value);
        setApiStatus(value ? t('apiKeySet') : t('apiKeyNotSet'));
      } else {
        setApiStatus(t('apiKeyNotSet'));
      }
    }
    load();
  }, [t, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await teacherApi.updateProfile({
        name: form.name,
        position: form.position,
        phone: form.phone,
        telegram: form.telegram,
        bio: form.bio,
        photo: form.photo,
      });
      setProfile(updated);
      updateUser({ ...user, name: updated.name, photo: updated.photo });
      setEditing(false);
    } catch { /* ignore */ }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    try {
      await teacherApi.updateApiKey(apiKey);
      if (apiKey) {
        alert(t('apiKeySaved'));
        setApiStatus(t('apiKeySet'));
      } else {
        alert(t('apiKeyRemoved'));
        setApiStatus(t('apiKeyNotSet'));
      }
    } catch { /* ignore */ }
  };

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

  const statusBadge = (avg, total) => {
    if (total === 0) return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{t('noTestsTaken')}</span>;
    if (avg >= 80) return <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{t('levelGreat')}</span>;
    if (avg >= 60) return <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{t('levelGood')}</span>;
    return <span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{t('levelNeedHelp')}</span>;
  };

  if (!profile) return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</p>;

  return (
    <>
      <h2>{t('teacherPanel')}</h2>
      {loadError && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: '#92400e' }}>{loadError}</p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-num">{stats.groups}</span><span className="stat-label">{t('groups')}</span></div>
        <div className="stat-card"><span className="stat-num">{stats.students}</span><span className="stat-label">{t('students')}</span></div>
        <div className="stat-card"><span className="stat-num">{stats.tests}</span><span className="stat-label">{t('tests')}</span></div>
        <div className="stat-card"><span className="stat-num">{stats.results}</span><span className="stat-label">{t('results')}</span></div>
      </div>

      {/* Profile */}
      <div className="card profile-card">
        <div className="card-header">
          <h3>{t('teacherProfile')}</h3>
          {!editing && (
            <button className="btn btn-sm" onClick={() => setEditing(true)} style={{ background: '#8b5cf6', color: '#fff' }}>
              {t('edit')}
            </button>
          )}
        </div>

        {!editing ? (
          <div className="profile-info">
            <img
              src={profile.photo || '/src/assets/placeholder.svg'}
              className="avatar-lg"
              alt={t('photo')}
              style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 12 }}
            />
            <div>
              <p><strong>{t('name')}:</strong> {profile.name}</p>
              <p><strong>{t('position')}:</strong> {profile.position || t('noInfo')}</p>
              <p><strong>{t('email')}:</strong> {profile.email}</p>
              <p><strong>{t('phone')}:</strong> {profile.phone || t('noInfo')}</p>
              <p><strong>{t('telegram')}:</strong> {profile.telegram || t('noInfo')}</p>
              <p><strong>{t('aboutMe')}:</strong> {profile.bio || t('noInfo')}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="profile-info" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={form.photo || '/src/assets/placeholder.svg'}
                    className="avatar-lg"
                    alt={t('photo')}
                    style={{ width: 120, height: 150, objectFit: 'cover', borderRadius: 12 }}
                  />
                  <input
                    type="text"
                    placeholder={t('photoUrl')}
                    value={form.photo || ''}
                    onChange={(e) => setForm({ ...form, photo: e.target.value })}
                    style={{ width: 120, fontSize: '0.75rem' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('name')}</label>
                  <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('position')}</label>
                  <input value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('email')}</label>
                  <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('phone')}</label>
                  <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('telegram')}</label>
                  <input value={form.telegram || ''} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('aboutMe')}</label>
                  <textarea rows={3} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" style={{ background: '#8b5cf6' }}>{t('save')}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>{t('cancel')}</button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* API Key */}
      <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <h3>{t('openaiSettings')}</h3>
        <p style={{ color: '#666', marginBottom: 12 }}>{t('openaiSettingsDesc')}</p>
        <form className="inline-form" onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ background: '#8b5cf6' }}>{t('save')}</button>
        </form>
        <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#666' }}>{apiStatus}</p>
      </div>

      {/* Rating */}
      {rating.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>{t('studentRating')}</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="results-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>{t('student')}</th>
                  <th>{t('group')}</th>
                  <th style={{ width: 80 }}>{t('tests')}</th>
                  <th style={{ width: 200 }}>{t('average')}</th>
                  <th>{t('level')}</th>
                </tr>
              </thead>
              <tbody>
                {rating.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{medal(i)}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.group_name}</td>
                    <td style={{ textAlign: 'center' }}>{s.test_count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 100, height: 8 }}>
                          <div style={{
                            width: `${s.avg}%`, height: '100%', borderRadius: 100,
                            background: s.avg >= 80 ? 'var(--success)' : s.avg >= 60 ? '#f59e0b' : 'var(--danger)',
                          }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: 36 }}>{s.avg}%</span>
                      </div>
                    </td>
                    <td>{statusBadge(s.avg, s.test_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
