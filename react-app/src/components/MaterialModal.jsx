import { useLang } from '../context/LanguageContext';
import { resolveApiUrl } from '../utils/api';

export default function MaterialModal({ material, onClose }) {
  const { t } = useLang();

  const { url, title } = material;
  const fileName = material.file_name || title;
  const resolvedUrl = resolveApiUrl(url);
  const ext = fileName?.split('.').pop().toLowerCase() || resolvedUrl?.split('.').pop().toLowerCase() || '';
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const canPreview = isPdf || isImage;

  const extInfo = {
    ppt: { icon: '📊', label: t('pptPresentation') },
    pptx: { icon: '📊', label: t('pptPresentation') },
    doc: { icon: '📝', label: t('wordDoc') },
    docx: { icon: '📝', label: t('wordDoc') },
    pdf: { icon: '📄', label: t('pdfFile') },
  };
  const info = extInfo[ext] || { icon: '📁', label: ext.toUpperCase() };

  const viewerUrl =
    isPdf && resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(resolvedUrl)}`
      : resolvedUrl;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {canPreview ? (
        <div style={{
          background: '#fff', borderRadius: 12, width: '90%', height: '90%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', borderBottom: '1px solid #eee',
          }}>
            <strong style={{ fontSize: '1.1rem' }}>{title}</strong>
            <div>
              {resolvedUrl && (
                <>
                  <a href={resolvedUrl} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ marginRight: 8 }}>
                    {t('open')}
                  </a>
                  <a href={resolvedUrl} download={fileName} className="btn btn-sm" style={{ marginRight: 8 }}>
                    {t('download')}
                  </a>
                </>
              )}
              {!resolvedUrl && (
                <span style={{ marginRight: 8, color: '#666', fontSize: '0.9rem' }}>
                  {t('loading')}
                </span>
              )}
              <button className="btn btn-sm" onClick={onClose} style={{ background: '#e74c3c', color: '#fff' }}>
                {t('closeModal')}
              </button>
            </div>
          </div>
          {!resolvedUrl ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              <div className="spinner" />
            </div>
          ) : isImage ? (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f5f5' }}>
              <img src={resolvedUrl} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          ) : (
            <iframe src={viewerUrl} style={{ flex: 1, border: 'none', width: '100%' }} title={title} />
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, width: 500, maxWidth: '90%', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{info.icon}</div>
          <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
          <p style={{ color: '#666', margin: '0 0 4px' }}>{info.label}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            {resolvedUrl ? (
              <>
                <a href={resolvedUrl} target="_blank" rel="noreferrer" className="btn" style={{ padding: '10px 24px', textDecoration: 'none' }}>
                  {t('open')}
                </a>
                <a href={resolvedUrl} download={fileName} className="btn btn-primary" style={{ padding: '10px 24px', textDecoration: 'none' }}>
                  {t('downloadFile')}
                </a>
              </>
            ) : (
              <span style={{ padding: '10px 24px', color: '#666' }}>{t('loading')}</span>
            )}
            <button onClick={onClose} className="btn" style={{ padding: '10px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {t('closeModal')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
