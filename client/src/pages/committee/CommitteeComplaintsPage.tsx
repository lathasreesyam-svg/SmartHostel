import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const statusColor: Record<string, string> = {
  OPEN: 'badge-danger', IN_PROGRESS: 'badge-warning', RESOLVED: 'badge-success', CLOSED: 'badge-muted',
};

export default function CommitteeComplaintsPage() {
  const [filter, setFilter] = useState('OPEN');
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['committee-complaints', filter],
    queryFn: () => api.get(`/complaints?${filter ? `status=${filter}&` : ''}limit=50`).then((r) => r.data),
  });

  const { data: detail } = useQuery({
    queryKey: ['complaint-detail', selected?.id],
    queryFn: () => api.get(`/complaints/${selected?.id}`).then((r) => r.data.data),
    enabled: !!selected,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/complaints/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committee-complaints'] }); toast.success('Status updated'); },
  });

  const addResponse = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/complaints/${id}/responses`, { message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaint-detail'] }); setResponse(''); toast.success('Response added'); },
  });

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Manage Complaints</h1>
          <p className="page-subtitle">Review and resolve student complaints</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />) :
              data?.data?.map((c: any) => (
                <div
                  key={c.id}
                  className="card"
                  style={{ padding: '14px 18px', cursor: 'pointer', borderColor: selected?.id === c.id ? 'var(--color-primary)' : undefined }}
                  onClick={() => setSelected(c)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span className={`badge ${statusColor[c.status] || 'badge-muted'}`}>{c.status.replace('_', ' ')}</span>
                        <span className="badge badge-muted">{c.category.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }} className="truncate">{c.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {c.isAnonymous ? 'Anonymous' : c.user?.studentProfile?.name || 'Unknown'} · {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-primary-light)' }}>{c._count?.responses || 0} resp.</span>
                  </div>
                </div>
              ))}
            {!isLoading && (!data?.data || data.data.length === 0) && (
              <div className="card"><div className="empty-state" style={{ padding: 40 }}>
                <Check size={28} color="var(--color-success)" /><h3>No {filter || ''} complaints</h3>
              </div></div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card" style={{ padding: 24, position: 'sticky', top: 'calc(var(--navbar-height) + 24px)', maxHeight: 'calc(100vh - var(--navbar-height) - 60px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{detail?.title}</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={16} /></button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{detail?.description}</p>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${detail?.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                    disabled={updateStatus.isPending}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                {detail?.responses?.map((r: any) => (
                  <div key={r.id} style={{ padding: 10, background: 'rgba(99,102,241,0.06)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: 3 }}>
                      {r.user?.studentProfile?.name || r.user?.role || 'Staff'}
                    </div>
                    <p style={{ fontSize: 13 }}>{r.message}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="Add response..." value={response} onChange={(e) => setResponse(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && response.trim()) addResponse.mutate({ id: selected.id, message: response }); }} />
                <button className="btn btn-primary" disabled={!response.trim()} onClick={() => addResponse.mutate({ id: selected.id, message: response })}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
