// src/components/Sidebar.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { currentUser, logout, getAllowedNavigation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMaster, setOpenMaster] = useState(false);

  const navItems = getAllowedNavigation();
  const currentPath = location.pathname.replace('/app/', '').replace('/app', '');

  const handleNav = (viewId) => {
    navigate(`/app/${viewId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) return null;

  const roleLabel = currentUser.role.replace("_", " ");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo text-gradient">
        🛠️ JobWork Tracker
      </div>

      <ul className="sidebar-menu">
        {navItems.map(menu => {
          if (menu.children && menu.children.length > 0) {
            return (
              <li key={menu.id} className="sidebar-item">
                <div
                  className="sidebar-link"
                  onClick={() => setOpenMaster(!openMaster)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="nav-icon">{menu.icon}</span>
                  <span className="nav-label">{menu.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{openMaster ? '▼' : '▶'}</span>
                </div>
                {openMaster && (
                  <ul style={{ listStyle: 'none', paddingLeft: '20px' }}>
                    {menu.children.map(child => (
                      <li key={child.id}>
                        <a
                          className={`sidebar-link ${currentPath === child.id ? 'active' : ''}`}
                          onClick={(e) => { e.preventDefault(); handleNav(child.id); }}
                          style={{ padding: '10px 16px', fontSize: '0.9rem' }}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          }
          return (
            <li key={menu.id} className="sidebar-item">
              <a
                className={`sidebar-link ${currentPath === menu.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNav(menu.id); }}
              >
                <span className="nav-icon">{menu.icon}</span>
                <span className="nav-label">{menu.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{currentUser.fullName.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{currentUser.fullName}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          🚪 Log Out
        </button>
      </div>
    </aside>
  );
}
