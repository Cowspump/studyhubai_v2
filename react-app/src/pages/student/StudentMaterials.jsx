import { useState, useEffect, useRef } from 'react';
import { useLang } from '../../context/LanguageContext';
import { studentApi, resolveApiUrl, normalizeListResponse } from '../../utils/api';
import MaterialModal from '../../components/MaterialModal';
import Spinner from '../../components/Spinner';

export default function StudentMaterials() {
  const { t } = useLang();
  const [materials, setMaterials] = useState([]);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const openReqIdRef = useRef(0);

  useEffect(() => {
    studentApi.getMaterials()
      .then((data) => setMaterials(normalizeListResponse(data)))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, []);

  const typeIcon = { pdf: '📄', video: '🎬', link: '🔗', file: '📁' };

  const byTopic = {};
  (materials || []).forEach((m) => {
    if (!byTopic[m.topic]) byTopic[m.topic] = [];
    byTopic[m.topic].push(m);
  });

  const openMaterial = async (m) => {
    const reqId = ++openReqIdRef.current;
    setPreviewMaterial({ ...m, url: null, file_name: m.file_name, _loading: true });
    try {
      const { url: materialUrl, file_name } = await studentApi.getMaterialUrl(m.id);
      // ignore outdated requests
      if (openReqIdRef.current !== reqId) return;
      setPreviewMaterial({ ...m, url: resolveApiUrl(materialUrl), file_name: file_name || m.file_name, _loading: false });
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;

  return (
    <div className="materials-section">
      <h2>{t('courseMaterials')}</h2>

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
                  <button className="btn btn-sm" onClick={() => openMaterial(m)}>{t('open')}</button>
                )}
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
