import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../../context/LanguageContext';
import { adminApi } from '../../utils/api';

export default function AdminTeachers() {
  const { t } = useLang();
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const loadTeachers = useCallback(async () => {
    try {
      const [teachersData, groupsData] = await Promise.all([
        adminApi.getTeachers(),
        adminApi.getGroups(),
      ]);
      setTeachers(teachersData);
      setGroups(groupsData);
    } catch {
      setTeachers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ name: '', email: '', password: '' });
    setError('');
    setModal('create');
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({ name: teacher.name, email: teacher.email, password: '' });
    setError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingTeacher(null);
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError(t('adminFillAllFields'));
      return;
    }
    try {
      await adminApi.createTeacher(form);
      closeModal();
      loadTeachers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email) {
      setError(t('adminFillAllFields'));
      return;
    }
    try {
      await adminApi.updateTeacher(editingTeacher.id, { name: form.name, email: form.email });
      closeModal();
      loadTeachers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (teacher) => {
    if (!confirm(`${t('adminConfirmDelete')} ${teacher.name}?`)) return;
    try {
      await adminApi.deleteTeacher(teacher.id);
      loadTeachers();
    } catch (err) {
      alert(err.message);
    }
  };


  if (loading) {
    return <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('loading')}</p>;
  }

  return (
    <>
      <div className="admin-page-header">
        <h2>{t('adminTeachersTitle')}</h2>
        <p>{t('adminTeachersDesc')}</p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-search">
            <span className="admin-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('adminSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + {t('adminAddTeacher')}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">👨‍🏫</div>
            <p>{search ? t('adminNoSearchResults') : t('adminNoTeachers')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('adminStatus')}</th>
                  <th>{t('date')}</th>
                  <th>{t('adminActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => (
                  <tr key={teacher.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>#{teacher.id}</td>
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
                    <td>
                      <div className="admin-actions">
                        <button className="admin-btn-icon" onClick={() => openEdit(teacher)} title={t('edit')}>
                          ✏️
                        </button>
                        <button className="admin-btn-icon danger" onClick={() => handleDelete(teacher)} title={t('delete')}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'create' ? t('adminAddTeacher') : t('adminEditTeacher')}</h3>
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit}>
              <div className="admin-form-group">
                <label>{t('name')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('name')}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>{t('email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('email')}
                  required
                />
              </div>
              {modal === 'create' && (
                <div className="admin-form-group">
                  <label>{t('password')}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t('password')}
                    required
                  />
                </div>
              )}
              {error && <p className="error-msg" style={{ marginBottom: '0.5rem' }}>{error}</p>}
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {modal === 'create' ? t('create') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
