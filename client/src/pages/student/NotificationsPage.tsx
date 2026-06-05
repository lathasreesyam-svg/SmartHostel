import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';

const typeColors: Record<string, string> = {
  ANNOUNCEMENT: 'badge-info',
  COMPLAINT_UPDATE: 'badge-warning',
  REBATE_UPDATE: 'badge-success',
  PAYMENT: 'badge-primary',
  EMERGENCY: 'badge-danger',
  GENERAL: 'badge-muted',
  MEAL_REMINDER: 'badge-purple',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { markAllAsRead } = useNotificationStore();
  const { logout } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then((r) => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => {
      markAllAsRead();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (token: string) => api.post('/notifications/accept-invite', { token }),
    onSuccess: () => {
      toast.success('Role accepted! Please log out and log back in.');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      // Give the toast a moment then force re-login
      setTimeout(() => { logout(); }, 3000);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to accept invite'),
  });

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{data?.pagination?.total || 0} total notifications</p>
          </div>
          <button className="btn btn-secondary" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCheck size={16} /> Mark All Read
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
          </div>
        ) : data?.data?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.data.map((n: any) => (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: '14px 18px',
                  borderColor: !n.isRead ? 'rgba(99,102,241,0.3)' : undefined,
                  background: !n.isRead ? 'rgba(99,102,241,0.04)' : undefined,
                  cursor: !n.isRead ? 'pointer' : 'default',
                }}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: !n.isRead ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bell size={16} color={!n.isRead ? 'var(--color-primary-light)' : 'var(--color-text-muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${typeColors[n.type] || 'badge-muted'}`}>{n.type.replace('_', ' ')}</span>
                      {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                    {/* Role Invite Accept Button */}
                    {n.metadata?.inviteToken && (
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: 10, fontSize: 12, padding: '6px 14px', gap: 6 }}
                        onClick={(e) => { e.stopPropagation(); acceptInviteMutation.mutate(n.metadata.inviteToken); }}
                        disabled={acceptInviteMutation.isPending}
                      >
                        <ShieldCheck size={13} />
                        {acceptInviteMutation.isPending ? 'Accepting…' : `Accept Role: ${n.metadata.targetRole}`}
                      </button>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Bell size={28} /></div>
              <h3>No notifications</h3>
              <p>You're all caught up!</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
