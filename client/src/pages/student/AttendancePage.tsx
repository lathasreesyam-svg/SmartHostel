import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '🌅 Breakfast',
  LUNCH: '☀️ Lunch',
  SNACKS: '🍎 Snacks',
  DINNER: '🌙 Dinner',
};

const MEAL_COLORS: Record<string, string> = {
  BREAKFAST: '#f59e0b',
  LUNCH: '#6366f1',
  SNACKS: '#10b981',
  DINNER: '#a855f7',
};

// Inline star rating for a specific scheduleId
function MealRating({ scheduleId, mealType }: { scheduleId: string; mealType: string }) {
  const [hovered, setHovered] = useState(0);
  const qc = useQueryClient();
  const color = MEAL_COLORS[mealType] || '#6366f1';

  const { data: myFeedback } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const existing = myFeedback?.find((f: any) => f.scheduleId === scheduleId);
  const currentRating = existing?.rating ?? 0;

  const submitMutation = useMutation({
    mutationFn: (rating: number) => api.post('/feedback', { scheduleId, rating }),
    onSuccess: () => {
      toast.success('⭐ Meal rated! Thank you for your feedback.');
      qc.invalidateQueries({ queryKey: ['my-feedback'] });
    },
    onError: () => toast.error('Failed to submit rating'),
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {currentRating > 0 ? 'Your rating:' : 'Rate meal:'}
      </span>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || currentRating);
          return (
            <button
              key={star}
              onClick={() => !currentRating && submitMutation.mutate(star)}
              onMouseEnter={() => !currentRating && setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              disabled={submitMutation.isPending || currentRating > 0}
              title={currentRating > 0 ? `Rated ${currentRating} star${currentRating > 1 ? 's' : ''}` : `Rate ${star} star${star > 1 ? 's' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: currentRating > 0 ? 'default' : 'pointer',
                padding: 2,
                lineHeight: 0,
              }}
            >
              <Star
                size={14}
                color={filled ? color : 'rgba(100,116,139,0.35)'}
                fill={filled ? color : 'none'}
                style={{ transition: 'all 0.1s' }}
              />
            </button>
          );
        })}
      </div>
      {currentRating > 0 && (
        <span style={{ fontSize: 10, color, fontWeight: 700 }}>{currentRating}★</span>
      )}
      {!currentRating && (
        <span style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 600 }}>Required</span>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [qrData, setQrData] = useState<{ qrDataUrl: string; token: string; schedule: any } | null>(null);
  useAuthStore();
  const qc = useQueryClient();

  const { data: todaySchedules } = useQuery({
    queryKey: ['today-menu'],
    queryFn: () => api.get('/menu/today').then((r) => r.data.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => api.get('/attendance/my?limit=30').then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/attendance/stats').then((r) => r.data.data),
  });

  const generateQR = useMutation({
    mutationFn: (scheduleId: string) => api.post('/attendance/qr/generate', { scheduleId }),
    onSuccess: (res) => {
      setQrData(res.data.data);
      toast.success('QR code generated! Show it at the mess counter');
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to generate QR'),
  });

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">QR-based meal attendance tracking</p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Attendance Rate</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{Math.round(stats?.percentage || 0)}%</div>
            <div style={{ height: 6, background: 'rgba(43,127,196,0.1)', borderRadius: 3, marginTop: 10 }}>
              <div style={{ height: '100%', width: `${stats?.percentage || 0}%`, background: 'var(--gradient-primary)', borderRadius: 3 }} />
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Meals Present</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-success)' }}>{stats?.present || 0}</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Meals Missed</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-danger)' }}>{stats?.absent || 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* QR Generator */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={18} color="var(--color-primary-light)" />
              Generate QR Code
            </h3>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Select Meal</label>
              <select
                className="form-input form-select"
                value={selectedSchedule}
                onChange={(e) => { setSelectedSchedule(e.target.value); setQrData(null); }}
              >
                <option value="">Choose today's meal...</option>
                {(todaySchedules || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {MEAL_LABELS[s.mealType] || s.mealType} ({s.startTime}–{s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!selectedSchedule || generateQR.isPending}
              onClick={() => generateQR.mutate(selectedSchedule)}
            >
              <QrCode size={16} />
              {generateQR.isPending ? 'Generating...' : 'Generate QR Code'}
            </button>

            {qrData && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <div style={{ padding: 16, background: 'white', borderRadius: 12, display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                  <img src={qrData.qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
                  Valid for 15 minutes · Show at the mess counter
                </p>
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 12, color: '#f59e0b', display: 'inline-block' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Expires soon
                </div>
              </div>
            )}

            {(!todaySchedules || todaySchedules.length === 0) && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: 13 }}>
                No meals scheduled for today
              </div>
            )}
          </div>

          {/* Attendance History with Feedback */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Attendance History</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              ⭐ Please rate each meal after attending — your feedback helps improve quality!
            </p>
            {attendance?.data?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                {attendance.data.map((a: any) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '12px 14px',
                      background: a.status === 'PRESENT' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                      borderRadius: 12,
                      border: `1px solid ${a.status === 'PRESENT' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: a.status === 'PRESENT' ? 8 : 0 }}>
                      {a.status === 'PRESENT' ? (
                        <CheckCircle size={16} color="var(--color-success)" />
                      ) : (
                        <AlertCircle size={16} color="var(--color-danger)" />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {MEAL_LABELS[a.schedule?.mealType] || a.schedule?.mealType}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {new Date(a.scannedAt).toLocaleDateString('en-IN')} at {new Date(a.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`badge ${a.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                        {a.status}
                      </span>
                    </div>

                    {/* Mandatory feedback for PRESENT meals */}
                    {a.status === 'PRESENT' && a.schedule?.id && (
                      <div style={{ paddingLeft: 26, paddingTop: 4, borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: 4 }}>
                        <MealRating scheduleId={a.schedule.id} mealType={a.schedule.mealType} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon"><QrCode size={28} /></div>
                <h3>No attendance records</h3>
                <p>Generate a QR code and get it scanned at the mess counter</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
