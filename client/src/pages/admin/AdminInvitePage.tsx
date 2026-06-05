import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, UserPlus, Eye, EyeOff, CheckCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function AdminInvitePage() {
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'ADMIN' as 'ADMIN'|'COMMITTEE'|'WARDEN' });
  const [showPass, setShowPass] = useState(false);
  const [created, setCreated] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: () => api.post('/auth/admin/create-user', { ...form, isEmailVerified: true, isActive: true }),
    onSuccess: () => {
      setCreated({ email: form.email, password: form.password, role: form.role });
      setForm({ email: '', name: '', password: '', role: 'ADMIN' });
      toast.success(`${form.role} account created!`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, password: pwd }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const ROLE_INFO: Record<string, { desc: string; color: string; icon: string }> = {
    ADMIN:     { desc: 'Full system access — can manage users, roles, blocks, analytics', color: '#ef4444', icon: '👑' },
    COMMITTEE: { desc: 'Can manage menu, inventory, complaints and view analytics', color: '#10b981', icon: '👥' },
    WARDEN:    { desc: 'Can view student data, approve rebates and monitor attendance', color: '#f59e0b', icon: '🛡️' },
  };

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Admin — Create Privileged User</h1>
          <p className="page-subtitle">Create Admin, Committee or Warden accounts</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 900 }}>
          {/* Form */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#ef4444" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>New Privileged Account</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['ADMIN', 'COMMITTEE', 'WARDEN'] as const).map(r => (
                    <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid', borderColor: form.role === r ? ROLE_INFO[r].color : 'var(--color-border)', background: form.role === r ? `${ROLE_INFO[r].color}18` : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: form.role === r ? 700 : 400, color: form.role === r ? ROLE_INFO[r].color : 'var(--color-text-muted)' }}>
                      {ROLE_INFO[r].icon}<br/>{r}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: `${ROLE_INFO[form.role].color}10`, fontSize: 12, color: ROLE_INFO[form.role].color }}>
                  {ROLE_INFO[form.role].desc}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Dr. Arun Kumar" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@college.edu" />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Password *</span>
                  <button onClick={generatePassword} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-primary-light)' }}>⚡ Generate Strong</button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" style={{ paddingRight: 40 }} />
                  <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={createMutation.isPending || !form.email || !form.password} onClick={() => createMutation.mutate()}>
                <UserPlus size={15} /> {createMutation.isPending ? 'Creating...' : `Create ${form.role} Account`}
              </button>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Success card */}
            {created && (
              <div className="card" style={{ padding: 22, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <CheckCircle size={20} color="#10b981" />
                  <div style={{ fontWeight: 700, color: '#10b981' }}>Account Created!</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  {[{ label: 'Email', value: created.email }, { label: 'Password', value: created.password }, { label: 'Role', value: created.role }].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontWeight: 600, fontFamily: f.label === 'Password' ? 'monospace' : 'inherit' }}>{f.value}</div>
                      </div>
                      <button onClick={() => copyToClipboard(f.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Copy size={13} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  ⚠️ Share these credentials securely. The password cannot be retrieved later.
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Role Permissions Summary</div>
              {Object.entries(ROLE_INFO).map(([role, info]) => (
                <div key={role} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 16 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: info.color }}>{role}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{info.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
