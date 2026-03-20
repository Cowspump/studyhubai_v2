import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { studentApi } from '../../utils/api';
import { formatTime } from '../../utils/helpers';

export default function StudentMessages() {
  const { user } = useAuth();
  const { t } = useLang();
  const [msgText, setMsgText] = useState('');
  const [teacher, setTeacher] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [teacherData, msgs] = await Promise.all([
        studentApi.getTeacher(),
        studentApi.getMessages(),
      ]);
      setTeacher(teacherData);
      setChatMsgs(msgs);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [chatMsgs.length]);

  if (!teacher) return <p>{t('teacherNotFound')}</p>;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    try {
      await studentApi.sendMessage(teacher.id, msgText.trim());
      setMsgText('');
      loadData();
    } catch { /* ignore */ }
  };

  return (
    <div className="messages-section">
      <h2>{t('messages')}</h2>
      <div className="msg-chat-box" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 520, boxShadow: 'var(--shadow)', background: 'var(--surface)' }}>
        <div className="msg-chat-header">
          <img
            src={teacher.photo || '/src/assets/placeholder.svg'}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            alt=""
          />
          <div>
            <strong>{teacher.name}</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{t('teacherLabel')}</p>
          </div>
        </div>

        <div className="msg-chat-messages" ref={chatRef}>
          {chatMsgs.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              {t('noMessagesStudent')}
            </p>
          )}
          {chatMsgs.map((m) => (
            <div key={m.id} className={`msg-bubble ${m.from_id === user.id ? 'msg-out' : 'msg-in'}`}>
              <div className="msg-text">{m.text}</div>
              <div className="msg-time">{formatTime(new Date(m.created_at).getTime())}</div>
            </div>
          ))}
        </div>

        <form className="msg-chat-input" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={t('writeMessage')}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            autoComplete="off"
            required
          />
          <button type="submit" className="btn btn-primary">{t('send')}</button>
        </form>
      </div>
    </div>
  );
}
