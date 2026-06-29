import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, X, CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
};

type Step = 1 | 2;

interface RebateForm {
  fromDate: string;
  toDate: string;
  reason: string;
  bankAccountName: string;
  bankAccountNumber: string;
  ifscCode: string;
  bankName: string;
}

const EMPTY_FORM: RebateForm = {
  fromDate: '',
  toDate: '',
  reason: '',
  bankAccountName: '',
  bankAccountNumber: '',
  ifscCode: '',
  bankName: '',
};

export default function RebatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<RebateForm>(EMPTY_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rebates'],
    queryFn: () => api.get('/rebates?limit=20').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: RebateForm) =>
      api.post('/rebates', {
        fromDate: new Date(body.fromDate + 'T00:00:00').toISOString(),
        toDate: new Date(body.toDate + 'T23:59:59').toISOString(),
        reason: body.reason,
        bankAccountName: body.bankAccountName,
        bankAccountNumber: body.bankAccountNumber,
        ifscCode: body.ifscCode,
        bankName: body.bankName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rebates'] });
      toast.success('Rebate application submitted!');
      setShowForm(false);
      setStep(1);
      setForm(EMPTY_FORM);
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

  const days =
    form.fromDate && form.toDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.toDate).getTime() - new Date(form.fromDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0;

  const step1Valid = form.fromDate && form.toDate && form.reason.trim().length >= 10 && days > 0;
  const step2Valid =
    form.bankAccountName.trim() &&
    form.bankAccountNumber.trim().length >= 5 &&
    form.ifscCode.trim().length === 11 &&
    form.bankName.trim();

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Rebate Applications</h1>
            <p className="page-subtitle">Apply for mess fee rebate during leaves</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setStep(1); setShowForm(true); }}>
            <Plus size={16} /> Apply for Rebate
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.data || []).map((r: any) => {
              const d = Math.ceil((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return (
                <div key={r.id} className="card animate-fade-in" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${statusColors[r.status]}`}>{r.status}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{d} day{d > 1 ? 's' : ''}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{r.reason}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {new Date(r.fromDate).toLocaleDateString('en-IN')} → {new Date(r.toDate).toLocaleDateString('en-IN')}
                      </p>
                      {r.reviewNote && (
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8, padding: '8px 12px', background: 'rgba(43,127,196,0.06)', borderRadius: 8 }}>
                          <strong>Note:</strong> {r.reviewNote}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Applied {new Date(r.createdAt).toLocaleDateString('en-IN')}</div>
                      {r.reviewedAt && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Reviewed {new Date(r.reviewedAt).toLocaleDateString('en-IN')}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!data?.data || data.data.length === 0) && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><Calendar size={28} /></div>
                  <h3>No rebate applications</h3>
                  <p>Apply for a rebate when you plan to be away from hostel</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-step Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Apply for Rebate</h2>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      style={{
                        height: 4, width: 48, borderRadius: 2,
                        background: step >= s ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>Step {step} of 2</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            <div className="modal-body">
              {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">From Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={form.fromDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: form.toDate < e.target.value ? '' : form.toDate })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">To Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={form.toDate}
                        min={form.fromDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {days > 0 && (
                    <div style={{ padding: 12, background: 'var(--color-primary-bg)', borderRadius: 10, fontSize: 13, color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                      📅 Duration: {days} day{days > 1 ? 's' : ''} · Estimated rebate period
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Reason <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Explain your reason (home visit, medical, festival, etc.) — minimum 10 characters..."
                      rows={4}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                    <span style={{ fontSize: 11, color: form.reason.length < 10 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {form.reason.length}/10 minimum characters
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 14, background: 'rgba(43,127,196,0.06)', borderRadius: 12, borderLeft: '3px solid var(--color-primary)' }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      <strong>Why bank details?</strong> If your rebate is approved, the mess fee deduction for {days} days will be refunded to this bank account.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Holder Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input className="form-input" placeholder="Full name as per bank" value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input className="form-input" placeholder="e.g. State Bank of India" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input className="form-input" placeholder="Enter account number" type="text" value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value.replace(/\D/g, '') })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">IFSC Code <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input
                      className="form-input"
                      placeholder="e.g. SBIN0001234"
                      style={{ textTransform: 'uppercase' }}
                      maxLength={11}
                      value={form.ifscCode}
                      onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                    />
                    {form.ifscCode && form.ifscCode.length !== 11 && (
                      <span className="form-error">IFSC code must be exactly 11 characters</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, background: 'rgba(22,163,74,0.06)', borderRadius: 10 }}>
                    <CreditCard size={16} color="#16a34a" />
                    <span style={{ fontSize: 12, color: '#15803d' }}>
                      Bank details are stored securely and only used for refund processing.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {step === 2 && (
                <button className="btn btn-ghost" onClick={() => setStep(1)}>
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              {step === 1 ? (
                <button
                  className="btn btn-primary"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!step2Valid || createMutation.isPending}
                  onClick={() => createMutation.mutate(form)}
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
