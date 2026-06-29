/**
 * Attendance Marking Page (Committee / Warden / Admin)
 *
 * RBAC: Only COMMITTEE, WARDEN, ADMIN can access this page
 * ABAC: Cannot mark yourself — enforced on both frontend and backend
 *
 * Features:
 *  - Select a meal schedule (today's meals shown first)
 *  - See full student list with current attendance status
 *  - Mark individual or bulk (all present / all absent)
 *  - Idempotent — marking again just updates the status
 *  - Real-time feedback with toast notifications
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Users, ChevronDown, Loader2, Save, CheckSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';

interface Schedule {
  id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface StudentEntry {
  studentId: string;
  name: string;
  rollNumber: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | null;
  markedAt: string | null;
}

const MEAL_LABELS = {
  BREAKFAST: { label: 'Breakfast', color: '#f59e0b', bg: '#fef3c7' },
  LUNCH: { label: 'Lunch', color: '#10b981', bg: '#d1fae5' },
  SNACKS: { label: 'Snacks', color: '#8b5cf6', bg: '#ede9fe' },
  DINNER: { label: 'Dinner', color: '#3b82f6', bg: '#dbeafe' },
};

export default function CommitteeAttendanceMarkPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [pendingMarks, setPendingMarks] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch today's active schedules
  const { data: schedulesData } = useQuery({
    queryKey: ['schedules-today'],
    queryFn: () => api.get('/menu/today').then(r => r.data.data as Schedule[]),
    refetchInterval: 60_000,
  });
  const schedules = schedulesData || [];

  // Fetch students for selected schedule
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['attendance-students', selectedScheduleId],
    queryFn: () =>
      api.get(`/attendance/schedule/${selectedScheduleId}/students`).then(r => r.data.data as StudentEntry[]),
    enabled: !!selectedScheduleId,
  });
  const students = studentsData || [];
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bulk mark mutation — ACID transaction on backend
  const bulkMarkMutation = useMutation({
    mutationFn: (entries: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' }>) =>
      api.post('/attendance/mark-bulk', { scheduleId: selectedScheduleId, entries }),
    onSuccess: (_, entries) => {
      toast.success(`Marked ${entries.length} students`);
      setPendingMarks({});
      qc.invalidateQueries({ queryKey: ['attendance-students', selectedScheduleId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save attendance');
    },
  });

  // Single mark mutation
  const singleMarkMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: 'PRESENT' | 'ABSENT' }) =>
      api.post('/attendance/mark', { scheduleId: selectedScheduleId, studentId, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-students', selectedScheduleId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to mark attendance');
    },
  });

  const togglePending = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    // ABAC: cannot mark yourself
    if (studentId === user?.id) {
      toast.error('You cannot mark your own attendance');
      return;
    }
    setPendingMarks(prev => {
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: status };
    });
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const marks: Record<string, 'PRESENT' | 'ABSENT'> = {};
    students.forEach(s => {
      if (s.studentId !== user?.id) marks[s.studentId] = status;
    });
    setPendingMarks(marks);
  };

  const savePending = () => {
    const entries = Object.entries(pendingMarks).map(([studentId, status]) => ({ studentId, status }));
    if (entries.length === 0) {
      toast('No changes to save', { icon: 'ℹ️' });
      return;
    }
    bulkMarkMutation.mutate(entries);
  };

  const markSingle = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (studentId === user?.id) {
      toast.error('You cannot mark your own attendance');
      return;
    }
    singleMarkMutation.mutate({ studentId, status });
  };

  const pendingCount = Object.keys(pendingMarks).length;

  return (
    <DashboardLayout title="Mark Attendance">
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          Mark Attendance
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Select a meal schedule and mark students present or absent.
        </p>
      </div>

      {/* Schedule Selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Meal Schedule
        </label>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <select
            id="schedule-select"
            value={selectedScheduleId}
            onChange={e => { setSelectedScheduleId(e.target.value); setPendingMarks({}); }}
            className="form-input"
            style={{ appearance: 'none', paddingRight: 36 }}
          >
            <option value="">— Select a schedule —</option>
            {schedules.map(s => {
              const meal = MEAL_LABELS[s.mealType];
              return (
                <option key={s.id} value={s.id}>
                  {meal.label} ({s.startTime} – {s.endTime})
                </option>
              );
            })}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>
      </div>

      {!selectedScheduleId && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <Users size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Select a schedule above to see the student list</p>
        </div>
      )}

      {selectedScheduleId && (
        <>
          {/* Search Bar */}
          <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              id="student-search"
              type="text"
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 36, fontSize: 13 }}
            />
          </div>

          {/* Bulk Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <button className="btn btn-sm" onClick={() => markAll('PRESENT')} style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
              <CheckSquare size={14} /> Mark All Present
            </button>
            <button className="btn btn-sm" onClick={() => markAll('ABSENT')} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
              <XCircle size={14} /> Mark All Absent
            </button>
            {pendingCount > 0 && (
              <button
                id="save-attendance-btn"
                className="btn btn-primary btn-sm"
                onClick={savePending}
                disabled={bulkMarkMutation.isPending}
                style={{ marginLeft: 'auto' }}
              >
                {bulkMarkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save {pendingCount} Changes
              </button>
            )}
          </div>

          {/* Student List */}
          {studentsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              <Users size={40} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 12 }}>{searchQuery ? 'No students match your search' : 'No students found'}</p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px', padding: '12px 20px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Student</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {filteredStudents.map((student, idx) => {
                const pending = pendingMarks[student.studentId];
                const current = pending ?? student.attendanceStatus;
                const isSelf = student.studentId === user?.id;

                return (
                  <div
                    key={student.studentId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 160px',
                      padding: '14px 20px',
                      borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--color-border)' : 'none',
                      alignItems: 'center',
                      background: pending ? 'rgba(43, 127, 196, 0.03)' : '#fff',
                      opacity: isSelf ? 0.5 : 1,
                    }}
                  >
                    {/* Student info */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                        {student.name}
                        {isSelf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{student.rollNumber}</div>
                    </div>

                    {/* Status badge */}
                    <div>
                      {current === 'PRESENT' && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '3px 10px', borderRadius: 20 }}>
                          Present
                        </span>
                      )}
                      {current === 'ABSENT' && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', background: '#fee2e2', padding: '3px 10px', borderRadius: 20 }}>
                          Absent
                        </span>
                      )}
                      {!current && (
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        id={`mark-present-${student.rollNumber}`}
                        disabled={isSelf || singleMarkMutation.isPending}
                        onClick={() => current === 'PRESENT' ? togglePending(student.studentId, 'PRESENT') : markSingle(student.studentId, 'PRESENT')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, cursor: isSelf ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 600, border: 'none',
                          background: current === 'PRESENT' ? '#10b981' : '#f0fdf4',
                          color: current === 'PRESENT' ? '#fff' : '#16a34a',
                          transition: 'all 0.15s',
                        }}
                      >
                        <CheckCircle2 size={13} /> P
                      </button>
                      <button
                        id={`mark-absent-${student.rollNumber}`}
                        disabled={isSelf || singleMarkMutation.isPending}
                        onClick={() => current === 'ABSENT' ? togglePending(student.studentId, 'ABSENT') : markSingle(student.studentId, 'ABSENT')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, cursor: isSelf ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 600, border: 'none',
                          background: current === 'ABSENT' ? '#ef4444' : '#fef2f2',
                          color: current === 'ABSENT' ? '#fff' : '#dc2626',
                          transition: 'all 0.15s',
                        }}
                      >
                        <XCircle size={13} /> A
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
