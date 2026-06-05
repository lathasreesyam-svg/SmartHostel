import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UtensilsCrossed, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const MEAL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  BREAKFAST: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', label: 'Breakfast' },
  LUNCH: { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', label: 'Lunch' },
  SNACKS: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Snacks' },
  DINNER: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7', label: 'Dinner' },
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StarRating({ scheduleId, color }: { scheduleId: string; color: string }) {
  const qc = useQueryClient();
  const [hovered, setHovered] = useState(0);

  const { data: myFeedback } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my').then(r => r.data.data),
    staleTime: 30_000,
  });

  const existing = myFeedback?.find((f: any) => f.scheduleId === scheduleId);
  const currentRating = existing?.rating ?? 0;

  const submitMutation = useMutation({
    mutationFn: (rating: number) => api.post('/feedback', { scheduleId, rating }),
    onSuccess: () => {
      toast.success('Rating submitted!');
      qc.invalidateQueries({ queryKey: ['my-feedback'] });
    },
    onError: () => toast.error('Failed to submit rating'),
  });

  return (
    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Rate:</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || currentRating);
          return (
            <button
              key={star}
              onClick={() => submitMutation.mutate(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              disabled={submitMutation.isPending}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
              title={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                size={15}
                color={filled ? color : 'rgba(100,116,139,0.35)'}
                fill={filled ? color : 'none'}
                style={{ transition: 'all 0.1s' }}
              />
            </button>
          );
        })}
      </div>
      {currentRating > 0 && (
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>({currentRating}★)</span>
      )}
    </div>
  );
}

export default function MenuPage() {
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['active-menu'],
    queryFn: () => api.get('/menu/active').then((r) => r.data.data),
  });

  const { data: todaySchedules } = useQuery({
    queryKey: ['today-menu'],
    queryFn: () => api.get('/menu/today').then((r) => r.data.data),
  });

  const today = new Date().getDay();

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Mess Menu</h1>
          <p className="page-subtitle">Weekly meal schedule</p>
        </div>

        {/* Today's Highlight with Rating */}
        {todaySchedules && todaySchedules.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 28, borderColor: 'rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UtensilsCrossed size={18} color="var(--color-primary-light)" />
              Today's Menu — {DAYS[today]}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {todaySchedules.map((schedule: any) => {
                const mc = MEAL_COLORS[schedule.mealType] || MEAL_COLORS.LUNCH;
                return (
                  <div key={schedule.id} style={{ padding: 14, background: mc.bg, borderRadius: 12, border: `1px solid ${mc.text}33` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: mc.text }}>{mc.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{schedule.startTime}–{schedule.endTime}</span>
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {schedule.items?.map((item: any) => (
                        <li key={item.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.isVeg ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                          {item.name}
                        </li>
                      ))}
                    </ul>
                    <StarRating scheduleId={schedule.id} color={mc.text} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Week */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[...Array(7)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: 12 }} />)}
          </div>
        ) : menuData ? (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Full Week Schedule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {DAYS.map((day, dayIndex) => {
                const daySchedules = menuData.schedules?.filter((s: any) => s.dayOfWeek === dayIndex) || [];
                const isToday = dayIndex === today;
                return (
                  <div key={dayIndex} className="card" style={{ padding: 20, borderColor: isToday ? 'rgba(99,102,241,0.4)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700 }}>{day}</h4>
                      {isToday && <span className="badge badge-primary">Today</span>}
                    </div>
                    {daySchedules.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {daySchedules.map((s: any) => {
                          const mc = MEAL_COLORS[s.mealType];
                          return (
                            <div key={s.id} style={{ padding: 10, background: mc?.bg, borderRadius: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: mc?.text, marginBottom: 4 }}>{s.mealType}</div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                {s.items?.map((item: any) => item.name).join(', ')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No schedule set
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><UtensilsCrossed size={28} /></div>
              <h3>No active menu</h3>
              <p>The mess committee hasn't set a menu yet</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
