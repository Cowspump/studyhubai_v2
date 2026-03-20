import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useLang } from '../../context/LanguageContext';
import StudentHome from './StudentHome';
import StudentMaterials from './StudentMaterials';
import StudentTests from './StudentTests';
import StudentAI from './StudentAI';
import StudentMessages from './StudentMessages';
import TakeTest from './TakeTest';
import TestResults from './TestResults';

export default function StudentDashboard() {
  const { t } = useLang();
  const links = [
    { to: '/student', label: t('navHome'), end: true },
    { to: '/student/materials', label: t('navMaterials') },
    { to: '/student/tests', label: t('navTests') },
    { to: '/student/ai', label: t('navAI') },
    { to: '/student/messages', label: t('navMessages'), showUnread: true },
  ];

  return (
    <div className="dashboard">
      <Sidebar links={links} />
      <main className="main-content">
        <Routes>
          <Route index element={<StudentHome />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="tests/take/:testId" element={<TakeTest />} />
          <Route path="tests/results/:testId" element={<TestResults />} />
          <Route path="ai" element={<StudentAI />} />
          <Route path="messages" element={<StudentMessages />} />
        </Routes>
      </main>
    </div>
  );
}
