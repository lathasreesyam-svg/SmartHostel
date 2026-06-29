import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, BookOpen, Building2, Hash,
  Edit3, Save, X, Shield, Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary-light)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
          {value ?? '—'}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: authUser } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', department: '', year: '', roomNumber: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data.data),
  });

  useEffect(() => {
    if (data?.studentProfile) {
      const p = data.studentProfile;
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        department: p.department || '',
        year: String(p.year || ''),
        roomNumber: p.roomNumber || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.patch('/auth/profile', { ...body, year: body.year ? Number(body.year) : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setEditing(false);
      toast.success('Profile updated!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/auth/profile'),
    onSuccess: () => {
      useAuthStore.getState().logout();
      window.location.href = '/auth/login';
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete account'),
  });

  const profile = data?.studentProfile;
  const initials = (profile?.name || authUser?.email || 'U')[0].toUpperCase();

  const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
    STUDENT: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
    COMMITTEE: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    ADMIN: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    WARDEN: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  };
  const roleStyle = ROLE_COLORS[authUser?.role || 'STUDENT'] || ROLE_COLORS.STUDENT;

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View and update your account information</p>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
            <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left — Avatar Card */}
            <div className="card" style={{ padding: 28, textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 800, color: 'white',
                margin: '0 auto 16px',
                boxShadow: '0 0 0 4px rgba(99,102,241,0.2)',
              }}>
                {initials}
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                {profile?.name || 'No Name'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {data?.email}
              </div>

              {/* Role badge */}
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: 20,
                background: roleStyle.bg,
                color: roleStyle.color,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>
                {authUser?.role}
              </span>

              {/* Verification status */}
              <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 10, background: data?.isEmailVerified ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${data?.isEmailVerified ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12, color: data?.isEmailVerified ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  <CheckCircle size={14} />
                  {data?.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                </div>
              </div>

              {/* Joined */}
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Calendar size={12} />
                Joined {data?.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
              </div>

              {/* Edit button (only for students) */}
              {authUser?.role === 'STUDENT' && !editing && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 20, width: '100%' }}
                  onClick={() => setEditing(true)}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>

            {/* Right — Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Account Info */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={15} color="var(--color-primary-light)" />
                  Account Information
                </div>
                <InfoRow icon={<Mail size={16} />} label="Email Address" value={data?.email} />
                <InfoRow icon={<Shield size={16} />} label="Role" value={data?.role} />
                <div style={{ paddingTop: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Account ID</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>
                    {data?.id}
                  </div>
                </div>
              </div>

              {/* Student Profile */}
              {profile && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={15} color="var(--color-primary-light)" />
                      Student Details
                    </span>
                    {editing && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setEditing(false)}>
                          <X size={13} /> Cancel
                        </button>
                        <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(form)}>
                          <Save size={13} /> {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
                      <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Room Number</label>
                        <input className="form-input" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="e.g. A-101" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Department</label>
                        <input className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year</label>
                        <input type="number" className="form-input" value={form.year} min={1} max={5} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <InfoRow icon={<User size={16} />} label="Full Name" value={profile.name} />
                      <InfoRow icon={<Hash size={16} />} label="Roll Number" value={profile.rollNumber} />
                      <InfoRow icon={<Phone size={16} />} label="Phone" value={profile.phone} />
                      <InfoRow icon={<BookOpen size={16} />} label="Department" value={profile.department} />
                      <InfoRow icon={<Calendar size={16} />} label="Year" value={profile.year ? `Year ${profile.year}` : undefined} />
                      <InfoRow icon={<Building2 size={16} />} label="Block" value={profile.block?.name} />
                      <InfoRow icon={<Hash size={16} />} label="Room Number" value={profile.roomNumber} />
                    </>
                  )}
                </div>
              )}

              {/* Non-student / no profile info */}
              {!profile && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} color="var(--color-primary-light)" />
                    Staff Account
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '24px 0', textAlign: 'center' }}>
                    Staff accounts don't have a student profile. Contact the admin to update your account details.
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="card" style={{ padding: 24, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.02)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                  <AlertTriangle size={15} color="#ef4444" />
                  Danger Zone
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                  Once you delete your account, there is no going back. Please be certain. All your data including complaints, attendance, and profile details will be permanently removed.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ background: '#ef4444', color: 'white', border: 'none', width: '100%', padding: '10px' }}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
                      deleteMutation.mutate();
                    }
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
