import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
} from 'react-router-dom';
import StudentsPage from './pages/Students';
import SchedulePage from './pages/Schedule';

// eslint-disable-next-line react-refresh/only-export-components
function Layout() {
  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 12,
          padding: 12,
          borderBottom: '1px solid #eee',
        }}
      >
        <NavLink
          to="/students"
          style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400 })}
        >
          학생
        </NavLink>
        <NavLink
          to="/schedule"
          style={({ isActive }) => ({ fontWeight: isActive ? 600 : 400 })}
        >
          시간표
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <StudentsPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'schedule', element: <SchedulePage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
