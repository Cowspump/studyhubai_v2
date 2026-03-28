import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { teacherApi } from '../../utils/api';
import { getInitials, formatTime } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

export default function TeacherMessages() {
  const { user } = useAuth();
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const [convos, students] = await Promise.all([
        teacherApi.getConversations(),
        teacherApi.getStudents(),
      ]);
      setConversations(convos);
      setAllStudents(students);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (partnerId) => {
    if (!partnerId) return;
    try {
      const msgs = await teacherApi.getMessages(partnerId);
      setChatMsgs(msgs);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [chatMsgs.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedId) return;
    try {
      await teacherApi.sendMessage(selectedId, msgText.trim());
      setMsgText('');
      loadMessages(selectedId);
      loadConversations();
    } catch { /* ignore */ }
  };

  const selectedStudent = allStudents.find((s) => s.id === selectedId);

  // Students without conversations
  const convoPartnerIds = new Set(conversations.map((c) => c.partner_id));
  const studentsWithoutConvo = allStudents.filter((s) => !convoPartnerIds.has(s.id));

  if (loading) return <Spinner />;

  return (
    <div className="messages-section">
      <h2>{t('messages')}</h2>
      <div className="msg-layout">
        <div className="msg-sidebar">
          {conversations.length === 0 && studentsWithoutConvo.length === 0 && (
            <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              {t('noMessages')}
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.partner_id}
              className={`msg-convo ${c.partner_id === selectedId ? 'msg-convo-active' : ''}`}
              onClick={() => setSelectedId(c.partner_id)}
            >
              <div className="avatar-initials" style={{ width: 40, height: 40, fontSize: '0.85rem', flexShrink: 0 }}>
                {getInitials(c.partner_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{c.partner_name}</strong>
                  {c.unread > 0 && <span className="msg-unread-badge">{c.unread}</span>}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.last_message?.slice(0, 40) || ''}
                </p>
              </div>
            </div>
          ))}

          {studentsWithoutConvo.length > 0 && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('allStudents')}</p>
              {studentsWithoutConvo.map((s) => (
                <div
                  key={s.id}
                  className={`msg-convo ${s.id === selectedId ? 'msg-convo-active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <div className="avatar-initials" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                    {getInitials(s.name)}
                  </div>
                  <span style={{ fontSize: '0.85rem' }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="msg-chat-box">
          {selectedStudent ? (
            <>
              <div className="msg-chat-header">
                <div className="avatar-initials" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <strong>{selectedStudent.name}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{selectedStudent.group_name || ''}</p>
                </div>
              </div>
              <div className="msg-chat-messages" ref={chatRef}>
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
                  placeholder={t('writeReply')}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  autoComplete="off"
                  required
                />
                <button type="submit" className="btn btn-primary">{t('send')}</button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              {t('selectStudent')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
