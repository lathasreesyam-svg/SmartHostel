import { useQuery } from '@tanstack/react-query';
import {
  Users, AlertTriangle, TrendingUp, Package, BarChart3,
  Calendar, Star, DollarSign,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(99,102,241,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data: dash } = useQuery({
    queryKey: ['admin-analytics-dash'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data.data).catch(() => null),
  });
  const { data: invData } = useQuery({
    queryKey: ['admin-analytics-inv'],
    queryFn: () => api.get('/analytics/inventory').then(r => r.data.data).catch(() => null),
  });
  const { data: attStats } = useQuery({
    queryKey: ['admin-att-stats'],
    queryFn: () => api.get('/attendance/stats').then(r => r.data.data).catch(() => null),
  });
  const { data: feedbackStats } = useQuery({
    queryKey: ['admin-feedback-stats'],
    queryFn: () => api.get('/feedback/stats').then(r => r.data.data).catch(() => null),
  });

  const statCards = [
    { label: 'Total Students', value: dash?.totalStudents ?? '—', icon: <Users size={20} />, color: '#6366f1', sub: 'registered users' },
    { label: 'Pending Complaints', value: dash?.pendingComplaints ?? '—', icon: <AlertTriangle size={20} />, color: '#f59e0b', sub: 'awaiting resolution' },
    { label: 'Pending Rebates', value: dash?.pendingRebates ?? '—', icon: <Calendar size={20} />, color: '#10b981', sub: 'awaiting approval' },
    { label: 'Inventory Items', value: invData?.totalItems ?? '—', icon: <Package size={20} />, color: '#3b82f6', sub: 'in stock' },
    { label: 'Total Meals Scanned', value: attStats?.total ?? '—', icon: <BarChart3 size={20} />, color: '#8b5cf6', sub: 'attendance records' },
    { label: 'Attendance Rate', value: attStats?.total ? `${Math.round(attStats.percentage)}%` : '—', icon: <TrendingUp size={20} />, color: '#06b6d4', sub: 'present ratio' },
  ];

  const byMealType: Record<string, any> = feedbackStats?.byMealType || {};
  const distribution: Record<number, number> = feedbackStats?.distribution || {};
  const maxDist = Math.max(...Object.values(distribution).map(Number), 1);

  const recent: any[] = feedbackStats?.recent || [];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">System-wide platform overview</p>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          {statCards.map((s) => (
            <div key={s.label} className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Meal Feedback Ratings */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Star size={18} color="#f59e0b" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Meal Ratings by Type</h3>
            </div>
            {Object.keys(byMealType).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: 13 }}>No feedback yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(byMealType).map(([meal, stats]: any) => (
                  <div key={meal}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{meal}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} color="#f59e0b" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{stats.avg.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({stats.count})</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(245,158,11,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(stats.avg / 5) * 100}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <BarChart3 size={18} color="#6366f1" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Rating Distribution</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 38 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{star}</span>
                    <Star size={10} color="#f59e0b" />
                  </div>
                  <MiniBar value={distribution[star] || 0} max={maxDist} color="#6366f1" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Total: {feedbackStats?.totalFeedback ?? 0} ratings
            </div>
          </div>

          {/* Inventory Summary */}
          {invData && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Package size={18} color="#3b82f6" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Inventory Snapshot</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total Items', value: invData.totalItems, color: '#3b82f6' },
                  { label: 'Low Stock', value: invData.lowStockItems, color: '#ef4444' },
                  { label: 'Categories', value: invData.categories ?? '—', color: '#8b5cf6' },
                  { label: 'Budget Used', value: invData.totalSpend ? `₹${Number(invData.totalSpend).toLocaleString('en-IN')}` : '₹0', color: '#10b981' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: 14, background: `${item.color}10`, borderRadius: 10, border: `1px solid ${item.color}22` }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Feedback Comments */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <DollarSign size={18} color="#10b981" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Feedback</h3>
            </div>
            {recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: 13 }}>No comments yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.slice(0, 5).map((f: any) => (
                  <div key={f.id} style={{ padding: 12, background: 'rgba(99,102,241,0.04)', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.user?.studentProfile?.name || 'Student'}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} color={i < f.rating ? '#f59e0b' : 'rgba(100,116,139,0.3)'} fill={i < f.rating ? '#f59e0b' : 'none'} />
                        ))}
                      </div>
                    </div>
                    {f.comment && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{f.comment}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
