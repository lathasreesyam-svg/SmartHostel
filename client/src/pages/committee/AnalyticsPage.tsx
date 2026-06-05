import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function AnalyticsPage() {
  const { data: dashStats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data) });
  const { data: complaintTrends } = useQuery({ queryKey: ['complaint-trends'], queryFn: () => api.get('/analytics/complaints/trends').then((r) => r.data.data) });
  const { data: attendanceTrends } = useQuery({ queryKey: ['attendance-trends'], queryFn: () => api.get('/analytics/attendance/trends').then((r) => r.data.data) });

  const byDayData = complaintTrends?.byDay
    ? Object.entries(complaintTrends.byDay).map(([date, count]) => ({ date: date.slice(5), count }))
    : [];

  const mealData = attendanceTrends?.byMealType
    ? Object.entries(attendanceTrends.byMealType).map(([meal, count]) => ({ meal, count }))
    : [];

  const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#a855f7'];

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Hostel performance insights</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Students', value: dashStats?.totalStudents || 0, color: '#6366f1' },
            { label: 'Open Complaints', value: dashStats?.openComplaints || 0, color: '#ef4444' },
            { label: 'Pending Rebates', value: dashStats?.pendingRebates || 0, color: '#f59e0b' },
            { label: 'Today Attendance', value: dashStats?.todayAttendance || 0, color: '#10b981' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Complaints (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={byDayData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Attendance by Meal</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={mealData.length ? mealData : [{ meal: 'No data', count: 1 }]} dataKey="count" nameKey="meal" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                  {mealData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % 4]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            {mealData.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {mealData.map((m: any, i: number) => (
                  <div key={m.meal} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i] }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>{m.meal}</span>
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
