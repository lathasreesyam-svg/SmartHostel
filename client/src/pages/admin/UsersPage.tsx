import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, UserCheck, UserX, ChevronDown, Mail, Send, Shield,
  RefreshCw, AlertTriangle, GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const ROLES = ['ALL', 'STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: '#6366f1',
  COMMITTEE: '#10b981',
  WARDEN: '#f59e0b',
  ADMIN: '#ef4444',
};

const ROLE_BG: Record<string, string> = {
  STUDENT: 'rgba(99,102,241,0.12)',
  COMMITTEE: 'rgba(16,185,129,0.12)',
  WARDEN: 'rgba(245,158,11,0.12)',
  ADMIN: 'rgba(239,68,68,0.12)',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [activeRole, setActiveRole] = useState<Role>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'COMMITTEE' | 'WARDEN' | 'ADMIN'>('COMMITTEE');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', activeRole, search, page],
    queryFn: () =>
      api.get('/admin/users', {
        params: {
          ...(activeRole !== 'ALL' && { role: activeRole }),
          ...(search && { search }),
          page,
          limit: 15,
        },
      }).then((r) => r.data),
    staleTime: 20_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}`, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'User reactivated' : 'User deactivated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setOpenMenuId(null);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted permanently');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setOpenMenuId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete user'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/admin/invite', { targetEmail: inviteEmail, targetRole: inviteRole }),
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send invite'),
  });

  // Open invite modal pre-filled with a specific user's email
  const openInviteForUser = (email: string) => {
    setInviteEmail(email);
    setInviteRole('COMMITTEE');
    setShowInviteModal(true);
    setOpenMenuId(null);
  };

  const users: any[] = data?.data || [];
  const pagination = data?.pagination;



  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{pagination?.total ?? 0} total users across all roles</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => refetch()}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => { setInviteEmail(''); setShowInviteModal(true); }}>
              <Send size={15} /> Send Role Invite
            </button>
          </div>
        </div>

        {/* Role Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => { setActiveRole(role); setPage(1); }}
              style={{
                padding: '7px 18px',
                borderRadius: 20,
                border: activeRole === role
                  ? `1.5px solid ${ROLE_COLORS[role] || 'var(--color-primary)'}`
                  : '1.5px solid var(--color-border)',
                background: activeRole === role
                  ? (ROLE_BG[role] || 'rgba(99,102,241,0.12)')
                  : 'transparent',
                color: activeRole === role
                  ? (ROLE_COLORS[role] || 'var(--color-primary-light)')
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeRole === role ? 700 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {role === 'ALL' ? 'All Users' : role}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Role change notice */}
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Shield size={14} color="var(--color-primary-light)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <strong>Role changes require user consent.</strong> Use the <em>"Invite to Role"</em> button on each user row. The user will receive a notification and must accept. Users elevated from STUDENT keep all their student access.
          </span>
        </div>

        {/* Users Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><Users size={28} /></div>
              <h3>No users found</h3>
              <p>Try changing the role filter or search term</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(99,102,241,0.03)' }}>
                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => {
                    const isElevated = user.primaryRole && user.primaryRole !== user.role;
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: ROLE_BG[user.role] || 'rgba(99,102,241,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, color: ROLE_COLORS[user.role] || '#6366f1', flexShrink: 0,
                            }}>
                              {(user.studentProfile?.name || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.studentProfile?.name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user.studentProfile?.rollNumber || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={12} style={{ opacity: 0.5 }} />
                            {user.email}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: ROLE_BG[user.role] || 'rgba(99,102,241,0.12)',
                              color: ROLE_COLORS[user.role] || '#6366f1',
                              display: 'inline-block',
                            }}>
                              {user.role}
                            </span>
                            {/* Show "originally STUDENT" badge when elevated */}
                            {isElevated && (
                              <span style={{
                                padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                                background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                              }}>
                                <GraduationCap size={9} /> originally {user.primaryRole}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: user.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: user.isActive ? '#10b981' : '#ef4444',
                          }}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: 12, padding: '5px 12px', gap: 4 }}
                              onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                            >
                              Actions <ChevronDown size={12} />
                            </button>
                            {openMenuId === user.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
                                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden',
                              }}>
                                <div style={{ padding: '8px 0' }}>
                                  {/* Invite to Role — replaces direct "Change Role" */}
                                  <button
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                      padding: '8px 14px', background: 'none', border: 'none',
                                      color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 13,
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                                    onClick={() => openInviteForUser(user.email)}
                                  >
                                    <Send size={13} color="var(--color-primary-light)" /> Invite to Role…
                                  </button>

                                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

                                  {/* Active/Deactivate toggle */}
                                  {user.isActive ? (
                                    <button
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                        padding: '8px 14px', background: 'none', border: 'none',
                                        color: '#ef4444', cursor: 'pointer', fontSize: 13,
                                      }}
                                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)')}
                                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                                      onClick={() => deactivateMutation.mutate({ id: user.id, isActive: false })}
                                      disabled={deactivateMutation.isPending}
                                    >
                                      <UserX size={13} /> Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                        padding: '8px 14px', background: 'none', border: 'none',
                                        color: '#10b981', cursor: 'pointer', fontSize: 13,
                                      }}
                                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.08)')}
                                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                                      onClick={() => deactivateMutation.mutate({ id: user.id, isActive: true })}
                                      disabled={deactivateMutation.isPending}
                                    >
                                      <UserCheck size={13} /> Reactivate
                                    </button>
                                  )}

                                  <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

                                  <button
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                      padding: '8px 14px', background: 'none', border: 'none',
                                      color: '#ef4444', cursor: 'pointer', fontSize: 13,
                                    }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to PERMANENTLY delete ${user.email}? This cannot be undone.`)) {
                                        deleteMutation.mutate(user.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Shield size={13} /> Delete User
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Page {page} of {pagination.totalPages} · {pagination.total} users
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="var(--color-primary-light)" />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Send Role Invitation</h2>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>User must accept from their Notifications page</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">User Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="student@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Elevate To</label>
                  <select
                    className="input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="COMMITTEE">Committee Member</option>
                    <option value="WARDEN">Warden</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {/* Elevation info note */}
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: 8 }}>
                  <GraduationCap size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#10b981' }}>
                    If this user is a student, they will <strong>keep all student access</strong> (menu, attendance, etc.) and also gain the new role's access. Invite expires in 48 hours.
                  </span>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 8 }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>
                    The user must accept this invitation. They will be notified via the Notifications page.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate()}
                >
                  {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop closer */}
        {openMenuId && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpenMenuId(null)} />
        )}
      </div>
    </DashboardLayout>
  );
}
