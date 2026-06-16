import React from 'react';
import { Compass, User, LogOut, ShieldAlert, KeyRound } from 'lucide-react';

export default function Navbar({ currentUser, activeRole, onGoToPortal, onLogout, onOpenAuthModal, onLogoClick }) {
  return (
    <nav className="glass-nav">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo" onClick={onLogoClick}>
          <Compass className="logo-icon spin-hover" size={28} />
          <span className="logo-text">Hub<span className="logo-accent">Hub</span> <span className="logo-badge">AI</span></span>
        </div>

        {/* Portal/Role Switcher - Replaced with Portal Button */}
        <div className="role-switcher-panel">
          <button 
            className="partner-portal-btn"
            onClick={onGoToPortal}
            style={{ 
              background: 'transparent',
              border: '1px solid var(--color-blue)',
              color: 'var(--color-blue)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-blue)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-blue)';
            }}
          >
            Kênh Chủ nhà / Đối tác
          </button>
        </div>

        {/* User Profile / Auth State */}
        <div className="nav-user-actions">
          {currentUser ? (
            <div className="user-profile-badge">
              <div className="avatar">
                {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser.full_name}</span>
                <span className="user-role-tag">
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'owner' ? 'Chủ khách sạn' : 'Khách hàng'}
                </span>
              </div>
              <button className="logout-btn" onClick={onLogout} title="Đăng xuất">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-trigger-btn" onClick={onOpenAuthModal}>
              <User size={16} />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
