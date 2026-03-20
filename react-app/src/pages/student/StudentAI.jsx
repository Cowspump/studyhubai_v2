import { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../../utils/openai';
import { studentApi } from '../../utils/api';
import { useLang } from '../../context/LanguageContext';

export default function StudentAI() {
  const { t } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const chatRef = useRef(null);
  const historyRef = useRef([{ role: 'system', content: t('aiSystemPrompt') }]);

  useEffect(() => {
    studentApi.getOpenaiKey().then((data) => setApiKey(data.openai_key || '')).catch(() => {});
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    historyRef.current.push({ role: 'user', content: userMsg });

    try {
      if (!apiKey) throw new Error(t('apiKeyNotSetShort'));
      const response = await chatWithAI(historyRef.current, apiKey);
      historyRef.current.push({ role: 'assistant', content: response });
      setMessages((prev) => [...prev, { role: 'bot', text: response }]);

      if (historyRef.current.length > 21) {
        historyRef.current = [historyRef.current[0], ...historyRef.current.slice(-20)];
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'error', text: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-section">
      <h2>{t('aiAssistant')}</h2>

      {!apiKey && (
        <div className="card" style={{ background: '#fef3c7', padding: 12, marginBottom: 12, borderRadius: 8 }}>
          {t('aiNoApiKey')}
        </div>
      )}

      <div
        className="chat-container"
        style={{
          display: 'flex', flexDirection: 'column', height: 500,
          border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
        }}
      >
        <div ref={chatRef} className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="message bot-message" style={{ background: '#f3f0ff', padding: 12, borderRadius: 12, maxWidth: '80%', alignSelf: 'flex-start' }}>
            {t('aiGreeting')}
          </div>

          {messages.map((m, i) => {
            if (m.role === 'user') {
              return (
                <div key={i} className="message user-message" style={{ background: '#e0e7ff', padding: 12, borderRadius: 12, maxWidth: '80%', alignSelf: 'flex-end' }}>
                  {m.text}
                </div>
              );
            }
            if (m.role === 'bot') {
              return (
                <div key={i} className="message bot-message" style={{ background: '#f3f0ff', padding: 12, borderRadius: 12, maxWidth: '80%', alignSelf: 'flex-start', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              );
            }
            return (
              <div key={i} style={{ background: '#fef2f2', padding: 12, borderRadius: 12, maxWidth: '80%', alignSelf: 'flex-start', color: '#991b1b' }}>
                {t('aiError')} {m.text}
              </div>
            );
          })}

          {loading && (
            <div style={{ background: '#f3f0ff', padding: 12, borderRadius: 12, maxWidth: '80%', alignSelf: 'flex-start', color: '#888' }}>
              {t('aiProcessing')}
            </div>
          )}
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('askQuestion')}
            disabled={loading}
            autoComplete="off"
            style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 20px' }}>
            {loading ? '⏳' : t('send')}
          </button>
        </form>
      </div>
    </div>
  );
}
