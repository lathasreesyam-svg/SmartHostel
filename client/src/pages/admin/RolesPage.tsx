import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const ROLES = ['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN'];
const ROLE_COLORS: Record<string, string> = {
  STUDENT: '#6366f1', COMMITTEE: '#10b981', WARDEN: '#f59e0b', ADMIN: '#ef4444',
};

export default function RolesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => api.get('/admin/users?limit=100').then(r => r.data).catch(() => ({ data: [] })),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Role updated'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update role'),
  });

  const users: any[] = data?.data || [];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Role Management</h1>
          <p className="page-subtitle">Assign and manage user roles</p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead><tr><th>User</th><th>Email</th><th>Current Role</th><th>Change Role</th></tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ROLE_COLORS[u.role] || '#6366f1'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ROLE_COLORS[u.role] || '#6366f1' }}>
                        {(u.profile?.name || u.email || 'U')[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.profile?.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{u.email}</td>
                  <td>
                    <span className="badge" style={{ background: `${ROLE_COLORS[u.role] || '#6366f1'}22`, color: ROLE_COLORS[u.role] || '#6366f1', border: `1px solid ${ROLE_COLORS[u.role] || '#6366f1'}44` }}>
                      <ShieldCheck size={11} style={{ display: 'inline', marginRight: 4 }} />{u.role}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form-input form-select"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={u.role}
                      onChange={e => { if (confirm(`Change ${u.email} role to ${e.target.value}?`)) changeRole.mutate({ id: u.id, role: e.target.value }); }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && users.length === 0 && (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><UserCheck size={28} /></div>
              <h3>No users found</h3>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
