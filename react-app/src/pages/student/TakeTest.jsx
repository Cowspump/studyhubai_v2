import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { studentApi } from '../../utils/api';
import Spinner from '../../components/Spinner';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    studentApi.getTest(testId).then(setTest).catch(() => setTest(null));
  }, [testId]);

  if (!test) return <Spinner />;

  const total = test.questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelect = (qIdx, optIdx) => {
    setAnswers({ ...answers, [qIdx]: optIdx });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const answerArray = [];
    test.questions.forEach((_, i) => {
      answerArray.push(answers[i] ?? -1);
    });

    try {
      await studentApi.submitTest(testId, answerArray);
      navigate(`/student/tests/results/${testId}`);
    } catch { /* ignore */ }
  };

  return (
    <div className="test-taking">
      <h2>{test.title}</h2>
      <div className="test-counter">{answeredCount} / {total} {t('answered')}</div>
      <div className="test-progress">
        <div className="test-progress-bar" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <form onSubmit={handleSubmit}>
        {test.questions.map((q, i) => (
          <div className="question-card" key={i}>
            <div className="q-header">
              <span className="q-number">{i + 1}</span>
              <span className="q-text">{q.q}</span>
            </div>
            <div className="option-group">
              {q.opts.map((o, j) => (
                <label className="option-label" key={j}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === j}
                    onChange={() => handleSelect(i, j)}
                    required={answers[i] === undefined}
                  />
                  <span className="option-letter">{LETTERS[j]}</span>
                  <span className="option-text">{o}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="test-submit-area">
          <button type="submit" className="btn btn-primary">{t('send')}</button>
        </div>
      </form>
    </div>
  );
}
