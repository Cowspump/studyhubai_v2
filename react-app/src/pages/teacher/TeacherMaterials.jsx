import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../../context/LanguageContext';
import { teacherApi } from '../../utils/api';
import MaterialModal from '../../components/MaterialModal';
import Spinner from '../../components/Spinner';

export default function TeacherMaterials() {
  const { t } = useLang();
  const [materials, setMaterials] = useState([]);
  const [groups, setGroups] = useState([]);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  const typeIcon = { pdf: '📄', video: '🎬', link: '🔗', file: '📁' };

  const loadData = useCallback(async () => {
    try {
      const [mats, grps] = await Promise.all([
        teacherApi.getMaterials(),
        teacherApi.getGroups(),
      ]);
      setMaterials(mats);
      setGroups(grps);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const byTopic = {};
  materials.forEach((m) => {
    if (!byTopic[m.topic]) byTopic[m.topic] = [];
    byTopic[m.topic].push(m);
  });

  const toggleGroup = (gid) => {
    setSelectedGroups((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]
    );
  };

  const saveMaterial = async (mType, mUrl, fileName) => {
    try {
      await teacherApi.createMaterial({
        topic,
        title,
        type: mType,
        url: mUrl,
        group_ids: selectedGroups,
        file_name: fileName || null,
      });
      setTopic(''); setTitle(''); setUrl(''); setFile(null); setSelectedGroups([]);
      loadData();
    } catch { /* ignore */ }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'file') {
      if (!file) return alert(t('selectFile'));
      const reader = new FileReader();
      reader.onload = () => saveMaterial(file.name.split('.').pop().toLowerCase(), reader.result, file.name);
      reader.readAsDataURL(file);
    } else {
      saveMaterial(type, url);
    }
  };

  const handleDelete = async (id) => {
    try {
      await teacherApi.deleteMaterial(id);
      loadData();
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;

  return (
    <div className="materials-section">
      <h2>{t('courseMaterials')}</h2>

      <div className="card form-card">
        <h3>{t('addMaterial')}</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder={t('topic')} value={topic} onChange={(e) => setTopic(e.target.value)} required />
          <input type="text" placeholder={t('title')} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="pdf">{t('typePdf')}</option>
            <option value="video">{t('typeVideo')}</option>
            <option value="link">{t('typeLink')}</option>
            <option value="file">{t('typeFile')}</option>
          </select>
          {type !== 'file' ? (
            <input type="url" placeholder={t('url')} value={url} onChange={(e) => setUrl(e.target.value)} required />
          ) : (
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.png"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>{file.name}</p>}
            </div>
          )}
          <div className="checkbox-group">
            {groups.map((g) => (
              <label key={g.id}>
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                {g.name}
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary">{t('add')}</button>
        </form>
      </div>

      {Object.keys(byTopic).length === 0 && <p className="empty-state">{t('noMaterials')}</p>}

      {Object.entries(byTopic).map(([topicName, items]) => (
        <div className="topic-group" key={topicName}>
          <h3>{topicName}</h3>
          <div className="materials-grid">
            {items.map((m) => (
              <div className="card material-card" key={m.id}>
                <span className="material-icon">{typeIcon[m.type] || '📁'}</span>
                <div className="material-info">
                  <strong>{m.title}</strong>
                  <span className={`badge badge-${m.type}`}>{m.type.toUpperCase()}</span>
                </div>
                {m.type === 'video' ? (
                  <div className="video-embed">
                    <iframe src={m.url} allowFullScreen title={m.title} />
                  </div>
                ) : (
                  <button className="btn btn-sm" onClick={() => setPreviewMaterial(m)}>{t('open')}</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>{t('delete')}</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {previewMaterial && (
        <MaterialModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      )}
    </div>
  );
}
