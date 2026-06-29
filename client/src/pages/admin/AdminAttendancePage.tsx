import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Filter, Users, UtensilsCrossed, ClipboardList, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const MEAL_COLORS: Record<string, { bg: string; text: string }> = {
  BREAKFAST: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  LUNCH:     { bg: 'rgba(99,102,241,0.12)',  text: '#6366f1' },
  SNACKS:    { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  DINNER:    { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PRESENT: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  ABSENT:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminAttendancePage() {
  const [page, setPage] = useState(1);
  const [mealType, setMealType] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-attendance', page, mealType, status, startDate, endDate],
    queryFn: () =>
      api.get('/attendance/all', {
        params: { page, limit: 20, ...(mealType && { mealType }), ...(status && { status }), ...(startDate && { startDate }), ...(endDate && { endDate }) },
      }).then(r => r.data),
    staleTime: 20_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['attendance-stats-admin'],
    queryFn: () => api.get('/attendance/stats').then(r => r.data.data).catch(() => null),
  });

  const records: any[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">All Attendance Records</h1>
            <p className="page-subtitle">Meal attendance marked by committee members</p>
          </div>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats Row */}
        {statsData && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Records', value: statsData.total, icon: <ClipboardList size={18} />, color: '#6366f1' },
              { label: 'Present', value: statsData.present, icon: <Users size={18} />, color: '#10b981' },
              { label: 'Absent', value: statsData.absent, icon: <Calendar size={18} />, color: '#ef4444' },
              { label: 'Attendance Rate', value: `${(statsData.attendanceRate ?? Math.round((statsData.present / (statsData.total || 1)) * 100)) || 0}%`, icon: <UtensilsCrossed size={18} />, color: '#f59e0b' },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.label}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Filters</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select className="input" style={{ maxWidth: 160 }} value={mealType} onChange={e => { setMealType(e.target.value); setPage(1); }}>
              <option value="">All Meals</option>
              {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input" style={{ maxWidth: 140 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
            </select>
            <input className="input" type="date" style={{ maxWidth: 160 }} value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} placeholder="From date" />
            <input className="input" type="date" style={{ maxWidth: 160 }} value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} placeholder="To date" />
            {(mealType || status || startDate || endDate) && (
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setMealType(''); setStatus(''); setStartDate(''); setEndDate(''); setPage(1); }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><ClipboardList size={28} /></div>
              <h3>No attendance records</h3>
              <p>No records match the selected filters</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(99,102,241,0.03)' }}>
                    {['Student', 'Roll No', 'Meal', 'Day', 'Time', 'Marked At', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => {
                    const mc = MEAL_COLORS[r.schedule?.mealType] || MEAL_COLORS.LUNCH;
                    const sc = STATUS_STYLE[r.status] || STATUS_STYLE.ABSENT;
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{r.user?.studentProfile?.name || 'Unknown'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {r.user?.studentProfile?.rollNumber || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: mc.bg, color: mc.text }}>
                            {r.schedule?.mealType || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {r.schedule?.dayOfWeek !== undefined ? DAYS[r.schedule.dayOfWeek] : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {r.schedule?.startTime}–{r.schedule?.endTime}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(r.markedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Page {page} of {pagination.totalPages} · {pagination.total} records
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }} disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
