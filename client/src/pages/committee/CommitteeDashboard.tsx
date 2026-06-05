import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Users,
  MessageSquare,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import api from '../../lib/api';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#06b6d4'];

export default function CommitteeDashboard() {
  const { data: dashStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  });

  const { data: complaintStats } = useQuery({
    queryKey: ['complaint-stats'],
    queryFn: () => api.get('/complaints/stats').then((r) => r.data.data),
  });

  const { data: complaints } = useQuery({
    queryKey: ['open-complaints'],
    queryFn: () => api.get('/complaints?status=OPEN&limit=5').then((r) => r.data),
  });

  const { data: alerts } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => api.get('/inventory/alerts').then((r) => r.data.data),
  });

  const statusData = complaintStats?.byStatus?.map((s: any) => ({
    name: s.status.replace('_', ' '),
    value: s._count,
  })) || [];

  const categoryData = complaintStats?.byCategory?.map((c: any) => ({
    name: c.category.replace('_', ' '),
    count: c._count,
  })) || [];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">
            Committee <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="page-subtitle">Hostel management overview</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard
            title="Total Students"
            value={dashStats?.totalStudents || 0}
            icon={<Users size={22} />}
            color="primary"
          />
          <StatCard
            title="Open Complaints"
            value={dashStats?.openComplaints || 0}
            icon={<MessageSquare size={22} />}
            color="danger"
          />
          <StatCard
            title="Pending Rebates"
            value={dashStats?.pendingRebates || 0}
            icon={<Calendar size={22} />}
            color="warning"
          />
          <StatCard
            title="Today's Attendance"
            value={dashStats?.todayAttendance || 0}
            icon={<CheckCircle size={22} />}
            color="success"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Complaint Category Chart */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Complaints by Category</h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}><p>No data yet</p></div>
            )}
          </div>

          {/* Complaint Status Pie */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Complaint Status</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{v}</span>} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}><p>No data yet</p></div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Open Complaints */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Open Complaints</h3>
              <a href="/committee/complaints" style={{ fontSize: 13, color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                View all →
              </a>
            </div>
            {complaints?.data?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {complaints.data.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(99,102,241,0.04)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={16} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }} className="truncate">{c.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {c.category.replace('_', ' ')} · {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge badge-danger">OPEN</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <CheckCircle size={28} color="var(--color-success)" />
                <p>No open complaints 🎉</p>
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={16} color="#f59e0b" />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Low Stock Alerts</h3>
            </div>
            {alerts?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.slice(0, 6).map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {item.currentStock} {item.unit} remaining
                      </div>
                    </div>
                    <span className="badge badge-warning">LOW</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <Package size={24} color="var(--color-success)" />
                <p style={{ fontSize: 12 }}>All stock OK</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
