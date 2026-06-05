import {
  UtensilsCrossed,
  MessageSquare,
  QrCode,
  Bell,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const attendanceData = [
  { day: 'Mon', breakfast: 85, lunch: 92, dinner: 78 },
  { day: 'Tue', breakfast: 88, lunch: 95, dinner: 82 },
  { day: 'Wed', breakfast: 72, lunch: 88, dinner: 75 },
  { day: 'Thu', breakfast: 90, lunch: 93, dinner: 88 },
  { day: 'Fri', breakfast: 85, lunch: 91, dinner: 80 },
  { day: 'Sat', breakfast: 70, lunch: 85, dinner: 72 },
  { day: 'Sun', breakfast: 65, lunch: 80, dinner: 68 },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: todayMenu } = useQuery({
    queryKey: ['today-menu'],
    queryFn: () => api.get('/menu/today').then((r) => r.data.data),
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/attendance/stats').then((r) => r.data.data),
  });

  const { data: complaints } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => api.get('/complaints?limit=5').then((r) => r.data),
  });

  const { data: notifications } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/notifications?limit=5').then((r) => r.data),
  });

  const mealTypeColors: Record<string, string> = {
    BREAKFAST: '#f59e0b',
    LUNCH: '#6366f1',
    SNACKS: '#10b981',
    DINNER: '#a855f7',
  };

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="gradient-text">{user?.profile?.name?.split(' ')[0] || 'Student'}</span> 👋
          </h1>
          <p className="page-subtitle">Here's what's happening today</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            title="Attendance Rate"
            value={`${Math.round(attendanceStats?.percentage || 0)}%`}
            icon={<QrCode size={22} />}
            color="primary"
            change={5}
          />
          <StatCard
            title="Meals Attended"
            value={attendanceStats?.present || 0}
            icon={<UtensilsCrossed size={22} />}
            color="success"
          />
          <StatCard
            title="Complaints"
            value={complaints?.pagination?.total || 0}
            icon={<MessageSquare size={22} />}
            color="warning"
          />
          <StatCard
            title="Notifications"
            value={notifications?.pagination?.total || 0}
            icon={<Bell size={22} />}
            color="info"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Attendance Chart */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Weekly Attendance</h3>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Your meal attendance this week</p>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                {['breakfast', 'lunch', 'dinner'].map((m) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: m === 'breakfast' ? '#f59e0b' : m === 'lunch' ? '#6366f1' : '#a855f7' }} />
                    <span style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="breakfast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lunch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dinner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                />
                <Area type="monotone" dataKey="breakfast" stroke="#f59e0b" fill="url(#breakfast)" strokeWidth={2} />
                <Area type="monotone" dataKey="lunch" stroke="#6366f1" fill="url(#lunch)" strokeWidth={2} />
                <Area type="monotone" dataKey="dinner" stroke="#a855f7" fill="url(#dinner)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Today's Menu */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Today's Menu</h3>
            {todayMenu && todayMenu.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {todayMenu.map((schedule: any) => (
                  <div
                    key={schedule.id}
                    style={{
                      padding: 12,
                      background: 'rgba(99,102,241,0.06)',
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        className="badge"
                        style={{
                          background: `${mealTypeColors[schedule.mealType]}22`,
                          color: mealTypeColors[schedule.mealType],
                        }}
                      >
                        {schedule.mealType}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {schedule.startTime} - {schedule.endTime}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {schedule.items?.map((item: any) => item.name).join(', ') || 'Menu items loading...'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <UtensilsCrossed size={32} color="var(--color-text-muted)" />
                <p>No menu for today</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Complaints</h3>
            <a href="/student/complaints" style={{ fontSize: 13, color: 'var(--color-primary-light)', textDecoration: 'none' }}>
              View all →
            </a>
          </div>
          {complaints?.data && complaints.data.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.data.slice(0, 5).map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.title}</td>
                      <td>
                        <span className="badge badge-muted">{c.category.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${c.status === 'RESOLVED' ? 'success' : c.status === 'OPEN' ? 'danger' : 'warning'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <MessageSquare size={28} color="var(--color-text-muted)" />
              <p>No complaints submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
