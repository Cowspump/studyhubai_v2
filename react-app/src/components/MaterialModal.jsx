import { useLang } from '../context/LanguageContext';

export default function MaterialModal({ material, onClose }) {
  const { t } = useLang();

  const { url, title, type } = material;
  const fileName = material.file_name || title;
  const ext = fileName?.split('.').pop().toLowerCase() || url?.split('.').pop().toLowerCase() || '';
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
              <a href={url} download={fileName} className="btn btn-sm" style={{ marginRight: 8 }}>
                {t('download')}
              </a>
              <button className="btn btn-sm" onClick={onClose} style={{ background: '#e74c3c', color: '#fff' }}>
                {t('closeModal')}
              </button>
            </div>
          </div>
          {isImage ? (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f5f5' }}>
              <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          ) : (
            <iframe src={url} style={{ flex: 1, border: 'none', width: '100%' }} title={title} />
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, width: 500, maxWidth: '90%', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{info.icon}</div>
          <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
          <p style={{ color: '#666', margin: '0 0 4px' }}>{info.label}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <a href={url} download={fileName} className="btn btn-primary" style={{ padding: '10px 24px', textDecoration: 'none' }}>
              {t('downloadFile')}
            </a>
            <button onClick={onClose} className="btn" style={{ padding: '10px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {t('closeModal')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
