import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { teacherApi } from '../../utils/api';

export default function TestEditPreview() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const [title, setTitle] = useState('');
  const [groupIds, setGroupIds] = useState([]);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (testId) {
      // Editing existing test — load from API
      teacherApi.getTests().then((data) => {
        const tests = data.items || [];
        const test = tests.find((t) => t.id === parseInt(testId));
        if (test) {
          setTitle(test.title);
          setGroupIds(test.group_ids);
          setQuestions(test.questions);
        }
      });
    } else if (location.state) {
      // Preview from AI generation — data passed via router state
      setTitle(location.state.title);
      setGroupIds(location.state.groupIds);
      setQuestions(location.state.questions);
    }
  }, [testId, location.state]);

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    if (field === 'q') updated[idx] = { ...updated[idx], q: value };
    else if (field === 'answer') updated[idx] = { ...updated[idx], answer: parseInt(value) };
    else {
      const optIdx = parseInt(field);
      const newOpts = [...updated[idx].opts];
      newOpts[optIdx] = value;
      updated[idx] = { ...updated[idx], opts: newOpts };
    }
    setQuestions(updated);
  };

  const removeQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (questions.length === 0) return alert(t('atLeastOneQuestion'));
    if (!title.trim()) return alert(t('enterTestName'));

    try {
      if (testId) {
        await teacherApi.updateTest(parseInt(testId), { title, group_ids: groupIds, questions });
      } else {
        await teacherApi.createTest({ title, group_ids: groupIds, questions });
      }
      navigate('/teacher/tests');
    } catch { /* ignore */ }
  };

  return (
    <div className="tests-section">
      <h2>{t('reviewQuestions')}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {t('reviewDesc')}
      </p>

      <div className="card form-card" style={{ borderLeft: '4px solid #8b5cf6', marginBottom: '1rem' }}>
        <label><strong>{t('testNameLabel')}</strong></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {questions.map((q, i) => (
        <div className="card edit-question-block" key={i} style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="card-header">
            <label><strong>{t('question')} {i + 1}</strong></label>
            <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(i)}>{t('delete')}</button>
          </div>
          <input
            type="text"
            value={q.q}
            onChange={(e) => updateQuestion(i, 'q', e.target.value)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {q.opts.map((opt, j) => (
              <input
                key={j}
                type="text"
                value={opt}
                onChange={(e) => updateQuestion(i, String(j), e.target.value)}
                placeholder={`${t('option')} ${j + 1}`}
              />
            ))}
          </div>
          <select
            value={q.answer}
            onChange={(e) => updateQuestion(i, 'answer', e.target.value)}
            style={{ marginTop: '0.5rem' }}
          >
            <option value={0}>{t('correctOption1')}</option>
            <option value={1}>{t('correctOption2')}</option>
            <option value={2}>{t('correctOption3')}</option>
            <option value={3}>{t('correctOption4')}</option>
          </select>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={handleSave} style={{ background: '#8b5cf6' }}>
          {t('saveTest')}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/teacher/tests')}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
