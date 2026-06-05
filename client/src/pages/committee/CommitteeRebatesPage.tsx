import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function CommitteeRebatesPage() {
  const [filter, setFilter] = useState('PENDING');
  const [reviewNote, setReviewNote] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['committee-rebates', filter],
    queryFn: () => api.get(`/rebates?${filter ? `status=${filter}&` : ''}limit=50`).then((r) => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/rebates/${id}/review`, { status, reviewNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['committee-rebates'] });
      toast.success('Rebate reviewed!');
      setSelected(null);
      setReviewNote('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const statusColor: Record<string, string> = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger' };

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Rebate Management</h1>
          <p className="page-subtitle">Review and approve student rebate applications</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((r: any) => {
                const days = Math.ceil((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.user?.studentProfile?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.user?.studentProfile?.rollNumber}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(r.fromDate).toLocaleDateString()} →<br />{new Date(r.toDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{days}d</td>
                    <td style={{ fontSize: 13, maxWidth: 200 }} className="truncate">{r.reason}</td>
                    <td><span className={`badge ${statusColor[r.status]}`}>{r.status}</span></td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => { setSelected(r); }}>
                            <Check size={12} /> Review
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!data?.data || data.data.length === 0) && (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No {filter || ''} rebates found</p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Review Rebate</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 14, background: 'rgba(99,102,241,0.06)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{selected.user?.studentProfile?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {new Date(selected.fromDate).toLocaleDateString()} – {new Date(selected.toDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 13, marginTop: 8 }}>{selected.reason}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Review Note (optional)</label>
                <textarea className="form-input form-textarea" placeholder="Add a note for the student..." rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: selected.id, status: 'REJECTED' })}>
                <X size={14} /> Reject
              </button>
              <button className="btn btn-primary" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: selected.id, status: 'APPROVED' })}>
                <Check size={14} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
