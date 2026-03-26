import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../../context/LanguageContext';
import { teacherApi } from '../../utils/api';
import { transliterate, generatePassword } from '../../utils/helpers';

export default function TeacherGroups() {
  const { t } = useLang();
  const [groups, setGroups] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [groupName, setGroupName] = useState('');
  const [assignGroupId, setAssignGroupId] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignStatus, setAssignStatus] = useState({ type: '', message: '' });
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [copyText, setCopyText] = useState(t('copyTable'));

  const loadData = useCallback(async () => {
    try {
      const groupsData = await teacherApi.getGroups();
      setGroups(groupsData);
      const map = {};
      for (const g of groupsData) {
        map[g.id] = await teacherApi.getGroupStudents(g.id);
      }
      setStudentsMap(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      await teacherApi.createGroup(groupName);
      setGroupName('');
      loadData();
    } catch { /* ignore */ }
  };

  const handleDeleteGroup = async (id) => {
    try {
      await teacherApi.deleteGroup(id);
      loadData();
    } catch { /* ignore */ }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await teacherApi.deleteStudent(id);
      loadData();
    } catch { /* ignore */ }
  };

  const handleAssignByEmail = async (e) => {
    e.preventDefault();
    setAssignStatus({ type: '', message: '' });
    if (!assignGroupId || !assignEmail.trim()) {
      setAssignStatus({ type: 'error', message: t('adminFillAllFields') });
      return;
    }

    try {
      await teacherApi.addStudentByEmail(parseInt(assignGroupId, 10), assignEmail.trim());
      setAssignStatus({ type: 'success', message: t('studentAssignedByEmailSuccess') });
      setAssignEmail('');
      await loadData();
    } catch (err) {
      setAssignStatus({ type: 'error', message: err.message || t('infoUnavailable') });
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    if (!bulkGroup || !bulkNames.trim()) return;

    const names = bulkNames.split('\n').map((n) => n.trim()).filter((n) => n.length > 0);
    if (names.length === 0) return;

    const existingEmails = new Set();
    Object.values(studentsMap).flat().forEach((s) => existingEmails.add(s.email));

    const students = names.map((name) => {
      const translitName = transliterate(name.split(/\s+/).slice(0, 2).join('.')).toLowerCase();
      let email = translitName + '@student.edu';
      let suffix = 1;
      while (existingEmails.has(email)) {
        email = translitName + suffix + '@student.edu';
        suffix++;
      }
      existingEmails.add(email);
      const password = generatePassword();
      return { name, email, password };
    });

    try {
      const created = await teacherApi.bulkCreateStudents(parseInt(bulkGroup), students);
      setCreatedAccounts(created);
      setBulkNames('');
      loadData();
    } catch { /* ignore */ }
  };

  const handleCopy = () => {
    const text = t('name') + '\t' + t('loginCol') + '\t' + t('password') + '\n' + createdAccounts.map((c) => `${c.name}\t${c.email}\t${c.password}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopyText(t('copied'));
      setTimeout(() => setCopyText(t('copyTable')), 2000);
    });
  };

  return (
    <>
      <h2>{t('manageGroups')}</h2>

      <div className="card form-card">
        <h3>{t('createGroup')}</h3>
        <form className="inline-form" onSubmit={handleAddGroup}>
          <input
            type="text"
            placeholder={t('groupNamePlaceholder')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">{t('create')}</button>
        </form>
      </div>

      <div className="card form-card">
        <h3>{t('addStudents')}</h3>
          <form className="inline-form" onSubmit={handleAssignByEmail} style={{ marginBottom: '1rem' }}>
            <select value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)} required>
              <option value="">{t('selectGroup')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input
              type="email"
              placeholder={t('studentEmailPlaceholder')}
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">{t('addStudentByEmail')}</button>
          </form>
          {assignStatus.message && (
            <p
              className={assignStatus.type === 'error' ? 'error-msg' : ''}
              style={{
                marginTop: '-0.25rem',
                marginBottom: '0.75rem',
                color: assignStatus.type === 'success' ? 'var(--success)' : undefined,
              }}
            >
              {assignStatus.message}
            </p>
          )}
        <form onSubmit={handleBulkAdd}>
          <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} required>
            <option value="">{t('selectGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <textarea
            rows={6}
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            placeholder={t('enterStudentNames')}
            required
          />
          <button type="submit" className="btn btn-primary">{t('generateAccounts')}</button>
        </form>

        {createdAccounts.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>{t('createdAccounts')}</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid var(--border)' }}>{t('name')}</th>
                  <th style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid var(--border)' }}>{t('loginCol')}</th>
                  <th style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid var(--border)' }}>{t('password')}</th>
                </tr>
              </thead>
              <tbody>
                {createdAccounts.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>{c.name}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>{c.email}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-sm" onClick={handleCopy} style={{ marginTop: '0.75rem' }}>{copyText}</button>
          </div>
        )}
      </div>

      {groups.map((g) => {
        const groupStudents = studentsMap[g.id] || [];
        return (
          <div className="card" key={g.id}>
            <div className="card-header">
              <h4>{g.name}</h4>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGroup(g.id)}>{t('delete')}</button>
            </div>
            <p>{groupStudents.length} {t('student')}</p>
            {groupStudents.length > 0 && (
              <ul className="student-list">
                {groupStudents.map((s) => (
                  <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {s.name} ({s.email})
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteStudent(s.id)}
                      style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.75rem' }}
                    >
                      {t('delete')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
