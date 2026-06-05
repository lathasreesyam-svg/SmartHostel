import { useQuery } from '@tanstack/react-query';
import { Star, BarChart3, MessageSquare, UtensilsCrossed } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

const MEAL_COLORS: Record<string, { bg: string; text: string }> = {
  BREAKFAST: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  LUNCH:     { bg: 'rgba(99,102,241,0.12)',  text: '#6366f1' },
  SNACKS:    { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  DINNER:    { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7' },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} color={i <= rating ? '#f59e0b' : 'rgba(100,116,139,0.3)'} fill={i <= rating ? '#f59e0b' : 'none'} />
      ))}
    </div>
  );
}

function RatingBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 42 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <Star size={10} color="#f59e0b" />
      </div>
      <div style={{ flex: 1, height: 8, background: 'rgba(245,158,11,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function FeedbackPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['feedback-stats'],
    queryFn: () => api.get('/feedback/stats').then(r => r.data.data),
  });

  const byMealType: Record<string, any> = data?.byMealType || {};
  const distribution: Record<number, number> = data?.distribution || {};
  const recent: any[] = data?.recent || [];
  const maxDist = Math.max(...Object.values(distribution).map(Number), 1);

  const overallAvg = Object.values(byMealType).length > 0
    ? Object.values(byMealType).reduce((sum: number, mt: any) => sum + mt.avg, 0) / Object.values(byMealType).length
    : 0;

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Meal Feedback</h1>
          <p className="page-subtitle">Student ratings and comments on mess meals</p>
        </div>

        {/* Top Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} color="#f59e0b" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Overall Rating</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#f59e0b' }}>{overallAvg.toFixed(1)}</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={14} color={i <= Math.round(overallAvg) ? '#f59e0b' : 'rgba(100,116,139,0.3)'} fill={i <= Math.round(overallAvg) ? '#f59e0b' : 'none'} />)}
            </div>
          </div>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={20} color="#6366f1" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Total Feedback</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>{data?.totalFeedback ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>student responses</div>
          </div>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UtensilsCrossed size={20} color="#10b981" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Meal Types Rated</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>{Object.keys(byMealType).length}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>of 4 meal types</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Average per Meal Type */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <BarChart3 size={18} color="#6366f1" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Average Rating by Meal</h3>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />)}
              </div>
            ) : Object.keys(byMealType).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>No feedback yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(byMealType).map(([meal, stats]: any) => {
                  const mc = MEAL_COLORS[meal] || MEAL_COLORS.LUNCH;
                  return (
                    <div key={meal}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: mc.bg, color: mc.text }}>{meal}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StarRow rating={Math.round(stats.avg)} />
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b' }}>{stats.avg.toFixed(1)}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({stats.count})</span>
                        </div>
                      </div>
                      <div style={{ height: 8, background: `${mc.text}18`, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${(stats.avg / 5) * 100}%`, height: '100%', background: mc.text, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Star size={18} color="#f59e0b" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Rating Distribution</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[5, 4, 3, 2, 1].map((star) => (
                <RatingBar key={star} label={String(star)} value={distribution[star] || 0} max={maxDist} />
              ))}
            </div>
          </div>

          {/* Recent Comments */}
          <div className="card" style={{ padding: 24, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <MessageSquare size={18} color="#8b5cf6" />
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Comments</h3>
            </div>
            {recent.filter(f => f.comment).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)', fontSize: 13 }}>No comments yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {recent.filter(f => f.comment).map((f: any) => (
                  <div key={f.id} style={{ padding: 14, background: 'rgba(99,102,241,0.04)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.user?.studentProfile?.name || 'Student'}</span>
                      <StarRow rating={f.rating} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>{f.comment}</p>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                      {new Date(f.createdAt).toLocaleDateString()}
                    </div>
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
