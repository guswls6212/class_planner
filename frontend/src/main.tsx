import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  NavLink,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import LoginButton from './components/atoms/LoginButton';
import ThemeToggle from './components/atoms/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import ManualPage from './pages/Manual';
import SchedulePage from './pages/Schedule';
import StudentsPage from './pages/Students';
import SubjectsPage from './pages/Subjects';
import './styles/global.css';

// eslint-disable-next-line react-refresh/only-export-components
function Layout() {
  return (
    <div>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <NavLink
            to="/students"
            style={({ isActive }) => ({
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-text-primary)',
            })}
          >
            학생
          </NavLink>
          <NavLink
            to="/subjects"
            style={({ isActive }) => ({
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-text-primary)',
            })}
          >
            과목
          </NavLink>
          <NavLink
            to="/schedule"
            style={({ isActive }) => ({
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-text-primary)',
            })}
          >
            시간표
          </NavLink>
          <NavLink
            to="/manual"
            style={({ isActive }) => ({
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-text-primary)',
            })}
          >
            사용법
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle size="small" variant="both" />
          <LoginButton />
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <StudentsPage /> },
        { path: 'students', element: <StudentsPage /> },
        { path: 'subjects', element: <SubjectsPage /> },
        { path: 'schedule', element: <SchedulePage /> },
        { path: 'manual', element: <ManualPage /> },
      ],
    },
  ],
  {
    basename: '/class_planner',
  },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
