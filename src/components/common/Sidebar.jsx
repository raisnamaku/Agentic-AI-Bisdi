import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Upload, FileText, LogOut, Settings } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export default function Sidebar({ activeTab, onTabChange, tabs }) {
  const { user, profile, signOut } = useAuth();
  const initials = (profile?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo"><img src={logoImg} alt="Logo" /></div>
        <div className="sidebar-title">
          <h2>Digi<span>Chatbot</span></h2>
          <p>{profile?.role === 'admin' ? 'Admin Panel' : 'Akademik'}</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {tabs.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => onTabChange(tab.id)}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <p>{profile?.full_name || user?.email}</p>
            <span>{profile?.role || 'user'}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={signOut}>
          <LogOut /> Keluar
        </button>
      </div>
    </aside>
  );
}
