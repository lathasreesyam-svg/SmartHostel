import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  MessageSquare,
  Calendar,
  Bell,
  CreditCard,
  QrCode,
  Users,
  Package,
  BarChart3,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Briefcase,
  User,
  Star,
  ClipboardList,
  GraduationCap,
  ScanLine,
  X,
  Bot,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { disconnectSocket } from '../../lib/socket';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const studentNav: NavItem[] = [
  { to: '/student/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/student/menu', icon: <UtensilsCrossed size={18} />, label: 'Menu' },
  { to: '/student/complaints', icon: <MessageSquare size={18} />, label: 'Complaints' },
  { to: '/student/rebates', icon: <Calendar size={18} />, label: 'Rebates' },
  { to: '/student/attendance', icon: <QrCode size={18} />, label: 'Attendance' },
  { to: '/student/notifications', icon: <Bell size={18} />, label: 'Notifications' },
  { to: '/student/payments', icon: <CreditCard size={18} />, label: 'Payments' },
  { to: '/student/chat', icon: <Bot size={18} />, label: 'AI Assistant' },
];

const committeeNav: NavItem[] = [
  { to: '/committee/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/committee/menu', icon: <UtensilsCrossed size={18} />, label: 'Menu' },
  { to: '/committee/complaints', icon: <MessageSquare size={18} />, label: 'Complaints' },
  { to: '/committee/rebates', icon: <Calendar size={18} />, label: 'Rebates' },
  { to: '/committee/attendance/scan', icon: <ScanLine size={18} />, label: 'Scan Attendance' },
  { to: '/committee/inventory', icon: <Package size={18} />, label: 'Inventory' },
  { to: '/committee/workers', icon: <Briefcase size={18} />, label: 'Workers' },
  { to: '/committee/feedback', icon: <Star size={18} />, label: 'Feedback' },
  { to: '/committee/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
  { to: '/committee/notifications', icon: <Bell size={18} />, label: 'Notifications' },
];

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Users' },
  { to: '/admin/blocks', icon: <Building2 size={18} />, label: 'Hostel Blocks' },
  { to: '/admin/inventory', icon: <Boxes size={18} />, label: 'Inventory' },
  { to: '/admin/complaints', icon: <MessageSquare size={18} />, label: 'Complaints' },
  { to: '/admin/rebates', icon: <Calendar size={18} />, label: 'Rebates' },
  { to: '/admin/attendance', icon: <ClipboardList size={18} />, label: 'Attendance' },
  { to: '/admin/workers', icon: <Briefcase size={18} />, label: 'Workers' },
];

function NavSection({
  items,
  sidebarCollapsed,
  label,
  labelColor,
  onItemClick,
}: {
  items: NavItem[];
  sidebarCollapsed: boolean;
  label?: string;
  labelColor?: string;
  onItemClick?: () => void;
}) {
  return (
    <div>
      {label && !sidebarCollapsed && (
        <div
          style={{
            padding: '6px 12px 4px',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: labelColor || 'var(--color-text-muted)',
          }}
        >
          {label}
        </div>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onItemClick}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: sidebarCollapsed ? '10px 16px' : '10px 12px',
            borderRadius: 10,
            color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
            background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
            border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            marginBottom: 4,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          })}
        >
          <span style={{ flexShrink: 0 }}>{item.icon}</span>
          {!sidebarCollapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  const handleItemClick = () => setMobileOpen(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const sidebar = document.getElementById('main-sidebar');
      const hamburger = document.getElementById('hamburger-btn');
      if (
        mobileOpen &&
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        hamburger &&
        !hamburger.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  const isElevated = user && user.role !== user.primaryRole;

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/auth/login');
  };

  const renderNav = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') {
      return <NavSection items={adminNav} sidebarCollapsed={sidebarCollapsed} onItemClick={handleItemClick} />;
    }
    if (user.role === 'STUDENT' || (!isElevated && user.primaryRole === 'STUDENT')) {
      return <NavSection items={studentNav} sidebarCollapsed={sidebarCollapsed} onItemClick={handleItemClick} />;
    }
    if (isElevated && user.primaryRole === 'STUDENT') {
      return (
        <>
          <NavSection items={committeeNav} sidebarCollapsed={sidebarCollapsed} label="Committee" labelColor="#10b981" onItemClick={handleItemClick} />
          {!sidebarCollapsed && <div style={{ margin: '8px 8px', borderTop: '1px dashed var(--color-border)' }} />}
          <NavSection items={studentNav} sidebarCollapsed={sidebarCollapsed} label="My Student Access" labelColor="#6366f1" onItemClick={handleItemClick} />
        </>
      );
    }
    return <NavSection items={committeeNav} sidebarCollapsed={sidebarCollapsed} onItemClick={handleItemClick} />;
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', padding: '18px 16px', borderBottom: '1px solid var(--color-border)', minHeight: 'var(--navbar-height)' }}>
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>SmartHostel</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{user?.role}</div>
                {isElevated && (
                  <div style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <GraduationCap size={9} />{user?.primaryRole}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="white" />
          </div>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="desktop-only-toggle"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 4, color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: sidebarCollapsed ? 0 : 8 }}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="mobile-close-btn"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 4, color: '#ef4444', cursor: 'pointer', display: 'none', alignItems: 'center' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
        {renderNav()}
      </nav>

      {/* User Footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {(user?.profile?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.profile?.name || 'User'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={() => { navigate('/profile'); handleItemClick(); }}
              title="My Profile"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-light)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)')}
            >
              <User size={14} />
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'transparent', border: '1px solid transparent', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', transition: 'all 0.15s ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        style={{
          width: sidebarCollapsed ? '72px' : 'var(--sidebar-width)',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          transition: 'width 0.25s ease, transform 0.25s ease',
          overflow: 'hidden',
        }}
        className={`sidebar-root${mobileOpen ? ' mobile-open' : ''}`}
      >
        {sidebarContent}
      </aside>

      {/* Hamburger button (mobile only) — rendered outside sidebar so Navbar can use it */}
      <button
        id="hamburger-btn"
        onClick={() => setMobileOpen((o) => !o)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 16,
          zIndex: 300,
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: 10,
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
        }}
        className="hamburger-btn"
      >
        {mobileOpen ? <X size={18} /> : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect y="2" width="18" height="2" rx="1" fill="white"/>
            <rect y="8" width="18" height="2" rx="1" fill="white"/>
            <rect y="14" width="18" height="2" rx="1" fill="white"/>
          </svg>
        )}
      </button>
    </>
  );
}
