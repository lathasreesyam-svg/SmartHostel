import { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, CheckCheck, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { disconnectSocket } from '../../lib/socket';

interface NavbarProps {
  title?: string;
}

// All navigable routes for quick search
const allRoutes = [
  { label: 'Dashboard', paths: ['/student/dashboard', '/committee/dashboard', '/admin/dashboard'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'] },
  { label: 'Menu', paths: ['/student/menu', '/committee/menu'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN'] },
  { label: 'Complaints', paths: ['/student/complaints', '/committee/complaints'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN'] },
  { label: 'Rebates', paths: ['/student/rebates', '/committee/rebates'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN'] },
  { label: 'Attendance', paths: ['/student/attendance'], roles: ['STUDENT'] },
  { label: 'Notifications', paths: ['/student/notifications', '/committee/notifications'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN'] },
  { label: 'Payments', paths: ['/student/payments'], roles: ['STUDENT'] },
  { label: 'Chat', paths: ['/student/chat'], roles: ['STUDENT'] },
  { label: 'Inventory', paths: ['/committee/inventory', '/admin/inventory'], roles: ['COMMITTEE', 'WARDEN', 'ADMIN'] },
  { label: 'Workers', paths: ['/committee/workers'], roles: ['COMMITTEE', 'WARDEN', 'ADMIN'] },
  { label: 'Analytics', paths: ['/committee/analytics', '/admin/analytics'], roles: ['COMMITTEE', 'WARDEN', 'ADMIN'] },
  { label: 'Users', paths: ['/admin/users'], roles: ['ADMIN'] },
  { label: 'Hostel Blocks', paths: ['/admin/blocks'], roles: ['ADMIN'] },
  { label: 'Roles', paths: ['/admin/roles'], roles: ['ADMIN'] },
  { label: 'My Profile', paths: ['/profile'], roles: ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'] },
];

const TYPE_COLORS: Record<string, string> = {
  ANNOUNCEMENT: '#6366f1',
  COMPLAINT_UPDATE: '#f59e0b',
  REBATE_UPDATE: '#10b981',
  PAYMENT: '#3b82f6',
  EMERGENCY: '#ef4444',
  GENERAL: '#64748b',
  MEAL_REMINDER: '#8b5cf6',
};

export default function Navbar({ title }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { sidebarCollapsed } = useLayoutStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const sidebarWidth = sidebarCollapsed ? '72px' : 'var(--sidebar-width)';

  const roleBasePath =
    user?.role === 'STUDENT'
      ? '/student'
      : user?.role === 'ADMIN'
      ? '/admin'
      : '/committee';

  const { data: notifData } = useQuery({
    queryKey: ['notifications-dropdown'],
    queryFn: () => api.get('/notifications?limit=8').then((r) => r.data),
    enabled: notifOpen,
    staleTime: 10_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      markAllAsRead();
      qc.invalidateQueries({ queryKey: ['notifications-dropdown'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-dropdown'] });
    },
  });

  const filteredRoutes = searchQuery.trim()
    ? allRoutes.filter(
        (r) =>
          r.roles.includes(user?.role || '') &&
          r.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchSelect = (route: typeof allRoutes[0]) => {
    const path = route.paths.find((p) => p.startsWith(roleBasePath)) || route.paths[0];
    navigate(path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/auth/login');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <>
      <header
        className="navbar-header"
        style={{
          position: 'fixed',
          top: 0,
          left: sidebarWidth,
          right: 0,
          height: 'var(--navbar-height)',
          background: 'var(--color-bg-card)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px 0 16px',
          zIndex: 100,
          transition: 'left 0.25s ease',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left: Title */}
        <div>
          {title ? (
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h1>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Welcome back, {user?.profile?.name?.split(' ')[0] || 'User'} 👋
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            {searchOpen ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 10,
                  width: 220,
                  transition: 'width 0.2s ease',
                }}
              >
                <Search size={14} color="var(--color-primary-light)" />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                    if (e.key === 'Enter' && filteredRoutes.length > 0) handleSearchSelect(filteredRoutes[0]);
                  }}
                  placeholder="Search pages..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    flex: 1,
                  }}
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                }}
              >
                <Search size={14} />
                <span>Quick search...</span>
              </button>
            )}

            {/* Search Results */}
            {searchOpen && searchQuery && filteredRoutes.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  zIndex: 300,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                {filteredRoutes.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => handleSearchSelect(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Search size={12} color="var(--color-text-muted)" />
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            {searchOpen && searchQuery && filteredRoutes.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  zIndex: 300,
                }}
              >
                No pages found
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              style={{
                position: 'relative',
                background: notifOpen ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                border: notifOpen ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '7px 10px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: 'var(--color-danger)',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--color-bg-primary)',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 340,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  zIndex: 300,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Notifications</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllMutation.mutate()}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--color-primary-light)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifData?.data?.length > 0 ? (
                    notifData.data.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) {
                            markReadMutation.mutate(n.id);
                            markAsRead(n.id);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: n.isRead ? 'default' : 'pointer',
                          background: !n.isRead ? 'rgba(99,102,241,0.05)' : 'transparent',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { if (!n.isRead) (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.1)'; }}
                        onMouseLeave={(e) => { if (!n.isRead) (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: n.isRead ? 'transparent' : (TYPE_COLORS[n.type] || '#6366f1'),
                            flexShrink: 0,
                            marginTop: 4,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      <Bell size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                      No notifications
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setNotifOpen(false); navigate(`${roleBasePath}/notifications`); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--color-primary-light)',
                    fontWeight: 500,
                    textAlign: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.06)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                >
                  View all notifications →
                </button>
              </div>
            )}
          </div>

          {/* User Avatar with Dropdown */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <button
              id="navbar-avatar-btn"
              onClick={() => setAvatarOpen((o) => !o)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
                border: avatarOpen ? '2px solid var(--color-primary-light)' : '2px solid var(--color-border)',
                boxShadow: avatarOpen ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {(user?.profile?.name || user?.email || 'U')[0].toUpperCase()}
            </button>

            {/* Avatar Dropdown */}
            {avatarOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 220,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  zIndex: 300,
                  overflow: 'hidden',
                }}
              >
                {/* User Info Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.profile?.name || 'User'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', letterSpacing: '0.05em' }}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                {/* My Profile */}
                <button
                  id="navbar-my-profile-btn"
                  onClick={() => { setAvatarOpen(false); navigate('/profile'); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <User size={15} color="var(--color-text-muted)" />
                  My Profile
                </button>

                {/* Logout */}
                <button
                  id="navbar-logout-btn"
                  onClick={() => { setAvatarOpen(false); handleLogout(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
