import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useLang } from '../../context/LanguageContext';
import TeacherHome from './TeacherHome';
import TeacherGroups from './TeacherGroups';
import TeacherMaterials from './TeacherMaterials';
import TeacherTests from './TeacherTests';
import TeacherMessages from './TeacherMessages';
import TestEditPreview from './TestEditPreview';

export default function TeacherDashboard() {
  const { t } = useLang();
  const links = [
    { to: '/teacher', label: t('navHome'), end: true },
    { to: '/teacher/groups', label: t('navGroups') },
    { to: '/teacher/materials', label: t('navMaterials') },
    { to: '/teacher/tests', label: t('navTests') },
    { to: '/teacher/messages', label: t('navMessages'), showUnread: true },
  ];

  return (
    <div className="dashboard">
      <Sidebar links={links} />
      <main className="main-content">
        <Routes>
          <Route index element={<TeacherHome />} />
          <Route path="groups" element={<TeacherGroups />} />
          <Route path="materials" element={<TeacherMaterials />} />
          <Route path="tests" element={<TeacherTests />} />
          <Route path="tests/edit/:testId" element={<TestEditPreview />} />
          <Route path="tests/preview" element={<TestEditPreview />} />
          <Route path="messages" element={<TeacherMessages />} />
        </Routes>
      </main>
    </div>
  );
}
