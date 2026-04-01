import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout as logoutAction } from '../store/authSlice';
import { api } from '../api/api';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const username = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username');
    dispatch(logoutAction());
    dispatch(api.util.resetApiState());
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
          <h1 className="header-title">Blog System</h1>
        </div>
        <div className="header-right">
          <span className="user-info">👤 {username}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <Link
            to="/"
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            📝 Posts
          </Link>
          <Link
            to="/tags"
            className={`nav-item ${location.pathname === '/tags' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            🏷️ Tags
          </Link>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Content */}
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}
