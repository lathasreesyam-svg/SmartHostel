import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, CheckCircle, IndianRupee, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

// Razorpay is loaded via CDN in index.html
declare global {
  interface Window {
    Razorpay: any;
  }
}

const statusColor: Record<string, string> = {
  SUCCESS: 'badge-success',
  PENDING: 'badge-warning',
  FAILED:  'badge-danger',
};

export default function PaymentsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get('/payments?limit=50').then((r) => r.data).catch(() => null),
  });

  const payments: any[] = data?.data ?? [];
  const pendingPayments = payments.filter((p: any) => p.status === 'PENDING');
  const totalPaid    = payments.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + p.amount, 0);
  const paidMonths   = payments.filter((p: any) => p.type === 'MESS_FEE' && p.status === 'SUCCESS').length;

  // Step 1: Create Razorpay order on backend
  const createOrderMutation = useMutation({
    mutationFn: (paymentId: string) =>
      api.post(`/payments/${paymentId}/create-order`).then((r) => r.data.data),
    onSuccess: (orderData) => {
      openRazorpayPopup(orderData);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to initiate payment'),
  });

  // Step 2: Verify payment on backend after Razorpay success
  const verifyMutation = useMutation({
    mutationFn: ({ paymentId, ...body }: any) =>
      api.post(`/payments/${paymentId}/verify`, body).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-payments'] });
      toast.success(`✅ Payment successful! Txn: ${res.data?.transactionId || 'completed'}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Payment verification failed'),
  });

  const openRazorpayPopup = (orderData: any) => {
    if (!window.Razorpay) {
      toast.error('Razorpay not loaded. Check your internet connection.');
      return;
    }

    const options = {
      key:         orderData.keyId,
      amount:      orderData.amount,
      currency:    orderData.currency,
      name:        'SmartHostel',
      description: orderData.description,
      order_id:    orderData.orderId,
      theme:       { color: '#2563eb' },
      handler: (response: any) => {
        // Called by Razorpay on successful payment
        verifyMutation.mutate({
          paymentId:           orderData.paymentId,
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => toast('Payment cancelled', { icon: 'ℹ️' }),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handlePayNow = (paymentId: string) => {
    createOrderMutation.mutate(paymentId);
  };

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Mess fee and payment history</p>
        </div>

        {/* Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Total Paid</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{paidMonths} months paid</div>
          </div>

          {pendingPayments.length > 0 ? (
            <div className="card" style={{ padding: 20, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)' }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Outstanding Dues</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
                ₹{pendingPayments.reduce((s: number, p: any) => s + p.amount, 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {pendingPayments.length} pending payment{pendingPayments.length > 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 20, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>
              <CheckCircle size={28} color="#10b981" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>All Paid! ✨</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>No outstanding dues</div>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Payment Gateway</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://razorpay.com/favicon.png" alt="Razorpay" width={20} height={20} style={{ borderRadius: 4 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Razorpay</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
              UPI · Cards · Netbanking · Wallets
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Payment History</h3>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><IndianRupee size={28} /></div>
              <h3>No payment records</h3>
              <p>Payment records will appear here once added by admin</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.description || `${p.type?.replace('_', ' ')} - ${p.month}/${p.year}`}</td>
                      <td><span className="badge badge-muted">{p.type?.replace('_', ' ')}</span></td>
                      <td style={{ fontWeight: 700, color: p.status === 'PENDING' ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                        ₹{p.amount?.toLocaleString('en-IN')}
                      </td>
                      <td><span className={`badge ${statusColor[p.status] || 'badge-muted'}`}>{p.status}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        {p.transactionId
                          ? <span title={p.transactionId}>{p.transactionId.slice(0, 20)}{p.transactionId.length > 20 ? '…' : ''}</span>
                          : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('en-IN')
                          : p.dueDate
                          ? `Due: ${new Date(p.dueDate).toLocaleDateString('en-IN')}`
                          : '—'}
                      </td>
                      <td>
                        {p.status === 'PENDING' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePayNow(p.id)}
                            disabled={createOrderMutation.isPending || verifyMutation.isPending}
                          >
                            {createOrderMutation.isPending ? 'Loading…' : (
                              <><CreditCard size={13} /> Pay</>
                            )}
                          </button>
                        )}
                        {p.status === 'SUCCESS' && p.transactionId && (
                          <a
                            href={`https://dashboard.razorpay.com/app/payments/${p.transactionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-primary)' }}
                          >
                            <ExternalLink size={11} /> View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test Mode Notice */}
        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          🧪 <span><strong>Test Mode:</strong> Use UPI ID <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4 }}>success@razorpay</code> or card <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4 }}>4111 1111 1111 1111</code> to simulate a successful payment.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
