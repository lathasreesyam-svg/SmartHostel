import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function BlocksPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 0, description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['hostel-blocks'],
    queryFn: () => api.get('/admin/blocks').then(r => r.data).catch(() => ({ data: [] })),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/admin/blocks', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hostel-blocks'] }); setShowAdd(false); toast.success('Block created!'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const blocks: any[] = data?.data || [];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Hostel Blocks</h1>
            <p className="page-subtitle">Manage hostel buildings and rooms</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15}/> Add Block</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />)
          ) : blocks.length > 0 ? blocks.map((block: any) => {
            const occupancyPct = ((block.currentOccupancy || 0) / (block.capacity || 1)) * 100;
            return (
              <div key={block.id} className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{block.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Capacity: {block.capacity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Users size={14} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13 }}>{block.currentOccupancy || 0} / {block.capacity} occupied</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${occupancyPct}%`, background: occupancyPct > 90 ? '#ef4444' : occupancyPct > 70 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>{Math.round(occupancyPct)}% occupancy</div>
              </div>
            );
          }) : (
            <div className="card" style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center' }}>
              <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <h3>No blocks yet</h3>
              <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>Add your first hostel block above</p>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 style={{ fontSize: 18, fontWeight: 700 }}>Add Hostel Block</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={16}/></button></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Block Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Block B" /></div>
              <div className="form-group"><label className="form-label">Capacity (rooms) *</label><input type="number" className="form-input" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={createMutation.isPending || !form.name || !form.capacity} onClick={() => createMutation.mutate(form)}>{createMutation.isPending ? 'Creating...' : 'Create Block'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
