import { useState } from 'react';
import { useLang } from '../../context/LanguageContext';
import { adminApi, setAdminToken } from '../../utils/api';
import '../../styles/admin.css';

export default function AdminLogin({ onLogin }) {
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await adminApi.login(username, password);
      setAdminToken(data.token);
      onLogin(data.user);
    } catch {
      setError(t('loginError'));
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>StudyHubAI</h1>
          <p>{t('adminPanel')}</p>
        </div>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label>{t('name')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="admin2077"
              autoComplete="username"
            />
          </div>
          <div className="admin-login-field">
            <label>{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="admin-login-error">{error}</p>}
          <button type="submit" className="admin-login-btn">{t('login')}</button>
        </form>
      </div>
    </div>
  );
}
