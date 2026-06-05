import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  gradient?: string;
}

const colorMap = {
  primary: 'var(--gradient-primary)',
  success: 'var(--gradient-success)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
  info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
};

export default function StatCard({
  title,
  value,
  icon,
  change,
  changeLabel,
  color = 'primary',
  gradient,
}: StatCardProps) {
  const bg = gradient || colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className="card animate-fade-in"
      style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: bg,
          opacity: 0.08,
          filter: 'blur(20px)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
          {change !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
                fontSize: 12,
                color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(change)}% {changeLabel || 'vs last month'}</span>
            </div>
          )}
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
