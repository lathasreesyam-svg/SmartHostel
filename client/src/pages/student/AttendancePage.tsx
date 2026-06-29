/**
 * Student Attendance Page (Read-Only)
 *
 * Shows the student's attendance history — marked by committee members.
 * QR code flow has been removed. Attendance is now marked manually.
 *
 * RBAC: Student can only see their own records (enforced on API via ABAC).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, CheckCircle2, XCircle, BarChart3, Loader2, Calendar } from 'lucide-react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'ABSENT';
  markedAt: string;
  schedule: {
    mealType: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  attendanceRate: number;
}

const MEAL_COLORS: Record<string, { bg: string; color: string }> = {
  BREAKFAST: { bg: '#fef3c7', color: '#d97706' },
  LUNCH:     { bg: '#d1fae5', color: '#059669' },
  SNACKS:    { bg: '#ede9fe', color: '#7c3aed' },
  DINNER:    { bg: '#dbeafe', color: '#2563eb' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: statsData } = useQuery<AttendanceStats>({
    queryKey: ['my-attendance-stats'],
    queryFn: () => api.get('/attendance/stats').then(r => r.data.data),
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['my-attendance', month, year],
    queryFn: () =>
      api.get('/attendance/my', { params: { month, year, limit: 100 } }).then(r => r.data),
  });

  const records: AttendanceRecord[] = historyData?.data || [];

  return (
    <DashboardLayout title="My Attendance">
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={26} color="var(--color-primary)" />
          My Attendance
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Attendance is marked by committee members at meal time.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Meals', value: statsData?.total ?? '—', color: '#6366f1', icon: <ClipboardList size={18} /> },
          { label: 'Present', value: statsData?.present ?? '—', color: '#10b981', icon: <CheckCircle2 size={18} /> },
          { label: 'Absent', value: statsData?.absent ?? '—', color: '#ef4444', icon: <XCircle size={18} /> },
          { label: 'Rate', value: statsData ? `${statsData.attendanceRate}%` : '—', color: '#f59e0b', icon: <BarChart3 size={18} /> },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: card.color }}>
              {card.icon}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Month Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="form-input"
          style={{ width: 140 }}
        >
          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="form-input"
          style={{ width: 100 }}
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Attendance History */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontWeight: 500 }}>No attendance records for this month</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Attendance is marked by committee members at each meal.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 100px 80px',
            padding: '12px 20px',
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Date &amp; Time</span>
            <span>Meal</span>
            <span>Day</span>
            <span>Status</span>
          </div>

          {records.map((record, idx) => {
            const meal = MEAL_COLORS[record.schedule.mealType] || { bg: '#f3f4f6', color: '#6b7280' };
            const date = new Date(record.markedAt);
            return (
              <div key={record.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 130px 100px 80px',
                padding: '14px 20px',
                borderBottom: idx < records.length - 1 ? '1px solid var(--color-border)' : 'none',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: meal.bg, color: meal.color, width: 'fit-content',
                }}>
                  {record.schedule.mealType}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {DAYS[record.schedule.dayOfWeek]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {record.status === 'PRESENT' ? (
                    <>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Present</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Absent</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
