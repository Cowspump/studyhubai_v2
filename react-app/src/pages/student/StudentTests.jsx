import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { studentApi } from '../../utils/api';
import Spinner from '../../components/Spinner';

export default function StudentTests() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [testsData, resultsData] = await Promise.all([
          studentApi.getTests(),
          studentApi.getResults(),
        ]);
        setTests(testsData.items || []);
        setResults(resultsData || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="tests-section">
      <h2>{t('myTests')}</h2>

      {tests.length === 0 && <p className="empty-state">{t('noTestsForGroup')}</p>}

      {tests.map((ts) => {
        const myResult = ts.result;
        return (
          <div className="card" key={ts.id}>
            <h4>{ts.title}</h4>
            <p>{ts.question_count} {t('questionWord')}</p>
            {myResult ? (
              <>
                <p className="score">
                  {t('resultLabel')} <strong>{myResult.score}/{myResult.total}</strong> ({Math.round((myResult.score / myResult.total) * 100)}%)
                </p>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/student/tests/results/${ts.id}`)}>
                  {t('viewAnswers')}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate(`/student/tests/take/${ts.id}`)}>
                {t('startTest')}
              </button>
            )}
          </div>
        );
      })}

      {results.length > 0 && (
        <>
          <h3>{t('resultsHistory')}</h3>
          <div className="results-grid">
            {results.map((r) => (
              <div className="card result-card" key={r.id}>
                <strong>{r.test_title}</strong>
                <span className="score">{r.score}/{r.total}</span>
                <span className="date">{new Date(r.created_at).toLocaleDateString('kk')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
