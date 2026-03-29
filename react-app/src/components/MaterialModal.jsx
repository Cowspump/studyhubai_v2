import { useState } from 'react';
import { useLang } from '../context/LanguageContext';
import { resolveApiUrl } from '../utils/api';

export default function MaterialModal({ material, onClose }) {
  const { t } = useLang();
  const [iframeFailed, setIframeFailed] = useState(false);

  const { url, title } = material;
  const isLoading = !url;
  const fileName = material.file_name || title;
  const resolvedUrl = resolveApiUrl(url);
  const ext = fileName?.split('.').pop().toLowerCase() || resolvedUrl?.split('.').pop().toLowerCase() || '';
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);

  const extInfo = {
    ppt: { icon: '📊', label: t('pptPresentation') },
    pptx: { icon: '📊', label: t('pptPresentation') },
    doc: { icon: '📝', label: t('wordDoc') },
    docx: { icon: '📝', label: t('wordDoc') },
    pdf: { icon: '📄', label: t('pdfFile') },
  };
  const info = extInfo[ext] || { icon: '📁', label: ext.toUpperCase() };

  const handleOpen = () => {
    if (resolvedUrl) window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!resolvedUrl) return;
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = fileName || 'file';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const canInlinePreview = (isPdf || isImage) && !iframeFailed;

  const renderToolbar = () => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px', borderBottom: '1px solid #eee',
    }}>
      <strong style={{ fontSize: '1.1rem' }}>{title}</strong>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {isLoading ? (
          <span style={{ color: '#666', fontSize: '0.9rem' }}>{t('loading')}</span>
        ) : (
          <>
            <button className="btn btn-sm" onClick={handleOpen}>{t('open')}</button>
            <button className="btn btn-sm" onClick={handleDownload}>{t('download')}</button>
          </>
        )}
        <button className="btn btn-sm" onClick={onClose} style={{ background: '#e74c3c', color: '#fff' }}>
          {t('closeModal')}
        </button>
      </div>
    </div>
  );

  const renderPreviewBody = () => {
    if (isLoading) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <div className="spinner" />
        </div>
      );
    }
    if (isImage) {
      return (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f5f5f5' }}>
          <img src={resolvedUrl} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      );
    }
    if (isPdf) {
      return (
        <object
          data={resolvedUrl}
          type="application/pdf"
          style={{ flex: 1, width: '100%', border: 'none' }}
          onError={() => setIframeFailed(true)}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, background: '#f5f5f5' }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <p style={{ color: '#666', margin: 0 }}>{t('pdfCannotPreview')}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleOpen}>{t('open')}</button>
              <button className="btn" onClick={handleDownload}>{t('downloadFile')}</button>
            </div>
          </div>
        </object>
      );
    }
    return null;
  };

  const renderDownloadCard = () => (
    <div style={{ background: '#fff', borderRadius: 16, width: 500, maxWidth: '90%', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{info.icon}</div>
      <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
      <p style={{ color: '#666', margin: '0 0 4px' }}>{info.label}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        {isLoading ? (
          <span style={{ padding: '10px 24px', color: '#666' }}>{t('loading')}</span>
        ) : (
          <>
            <button className="btn" onClick={handleOpen} style={{ padding: '10px 24px' }}>{t('open')}</button>
            <button className="btn btn-primary" onClick={handleDownload} style={{ padding: '10px 24px' }}>{t('downloadFile')}</button>
          </>
        )}
        <button onClick={onClose} className="btn" style={{ padding: '10px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {t('closeModal')}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {canInlinePreview ? (
        <div style={{
          background: '#fff', borderRadius: 12, width: '90%', height: '90%',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {renderToolbar()}
          {renderPreviewBody()}
        </div>
      ) : (
        renderDownloadCard()
      )}
    </div>
  );
}
