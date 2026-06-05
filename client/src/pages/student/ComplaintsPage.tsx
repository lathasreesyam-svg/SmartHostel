import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'FOOD_QUALITY', label: 'Food Quality' },
  { value: 'FOOD_QUANTITY', label: 'Food Quantity' },
  { value: 'HYGIENE', label: 'Hygiene' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'STAFF_BEHAVIOUR', label: 'Staff Behaviour' },
  { value: 'OTHER', label: 'Other' },
];

const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  isAnonymous: boolean;
}

const statusColor: Record<string, string> = {
  OPEN: 'badge-danger',
  IN_PROGRESS: 'badge-warning',
  RESOLVED: 'badge-success',
  CLOSED: 'badge-muted',
};

export default function ComplaintsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState('');
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const params = new URLSearchParams({ page: String(page), limit: '10' });
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page, category, status],
    queryFn: () => api.get(`/complaints?${params}`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: ComplaintFormData) => api.post('/complaints', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted successfully');
      setShowForm(false);
    },
    onError: (e: any) => {
      const data = e.response?.data;
      if (data?.errors && data.errors.length > 0) {
        toast.error(data.errors[0].message);
      } else {
        toast.error(data?.message || 'Failed to submit');
      }
    },
  });

  const responseMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/complaints/${id}/responses`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint-detail'] });
      setResponse('');
      toast.success('Response added');
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['complaint-detail', selectedComplaint?.id],
    queryFn: () => api.get(`/complaints/${selectedComplaint?.id}`).then((r) => r.data.data),
    enabled: !!selectedComplaint,
  });

  const [form, setForm] = useState<ComplaintFormData>({
    title: '',
    description: '',
    category: 'FOOD_QUALITY',
    isAnonymous: false,
  });

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Complaints</h1>
            <p className="page-subtitle">Submit and track your complaints</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Complaint
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            className="form-input form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Complaints List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ))}
          </div>
        ) : data?.data?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.data.map((c: any) => (
              <div
                key={c.id}
                className="card animate-fade-in"
                style={{ padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setSelectedComplaint(c)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-muted">{c.category.replace('_', ' ')}</span>
                      {c.isAnonymous && <span className="badge badge-purple">Anonymous</span>}
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }} className="truncate">{c.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }} className="truncate">
                      {c.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${statusColor[c.status] || 'badge-muted'}`}>{c.status.replace('_', ' ')}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    {c._count?.responses > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MessageSquare size={10} /> {c._count.responses}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {data.pagination && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><MessageSquare size={28} /></div>
              <h3>No complaints found</h3>
              <p>Submit your first complaint using the button above</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Complaint Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Complaint</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    placeholder="Brief title of the issue"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input form-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c.value).map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Describe the issue in detail..."
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.isAnonymous}
                    onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                  />
                  Submit anonymously
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={createMutation.isPending || !form.title || !form.description}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{detail?.title || selectedComplaint.title}</h2>
                <span className={`badge ${statusColor[selectedComplaint.status]}`} style={{ marginTop: 4 }}>
                  {selectedComplaint.status}
                </span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedComplaint(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                {detail?.description || selectedComplaint.description}
              </p>

              {/* Responses */}
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Responses ({detail?.responses?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                {detail?.responses?.map((r: any) => (
                  <div key={r.id} style={{ padding: 12, background: r.user?.id === user?.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-primary-light)', fontWeight: 600, marginBottom: 4 }}>
                      {r.user?.studentProfile?.name || r.user?.role || 'Staff'} · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                    <p style={{ fontSize: 13 }}>{r.message}</p>
                  </div>
                ))}
                {(!detail?.responses || detail.responses.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No responses yet</p>
                )}
              </div>

              {/* Add Response */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Add a response..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && response.trim()) {
                      responseMutation.mutate({ id: selectedComplaint.id, message: response });
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  disabled={!response.trim() || responseMutation.isPending}
                  onClick={() => responseMutation.mutate({ id: selectedComplaint.id, message: response })}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
