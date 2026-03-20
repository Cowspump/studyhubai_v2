import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function getHomeRoute(role) {
  if (role === 'teacher') return '/teacher';
  return '/student';
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={getHomeRoute(user.role)} replace /> : <Navigate to="/" replace />}
      />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={user ? <Navigate to={getHomeRoute(user.role)} replace /> : <LandingPage />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? getHomeRoute(user.role) : '/'} replace />}
      />
    </Routes>
  );
}
