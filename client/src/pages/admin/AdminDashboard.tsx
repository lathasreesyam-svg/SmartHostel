import { useQuery } from '@tanstack/react-query';
import { Users, Building2, Package, BarChart3, Settings } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import api from '../../lib/api';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  });

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Admin <span className="gradient-text">Dashboard</span></h1>
          <p className="page-subtitle">System-wide overview and administration</p>
        </div>

        <div className="stats-grid">
          <StatCard title="Total Students" value={stats?.totalStudents || 0} icon={<Users size={22} />} color="primary" />
          <StatCard title="Open Complaints" value={stats?.openComplaints || 0} icon={<BarChart3 size={22} />} color="danger" />
          <StatCard title="Pending Rebates" value={stats?.pendingRebates || 0} icon={<Building2 size={22} />} color="warning" />
          <StatCard title="Inventory Items" value={stats?.totalInventoryItems || 0} icon={<Package size={22} />} color="success" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
          {[
            { title: 'User Management', desc: 'Manage student and staff accounts', href: '/admin/users', icon: <Users size={24} />, color: '#6366f1' },
            { title: 'Hostel Blocks', desc: 'Manage rooms and blocks', href: '/admin/blocks', icon: <Building2 size={24} />, color: '#a855f7' },
            { title: 'Analytics', desc: 'Full system analytics', href: '/admin/analytics', icon: <BarChart3 size={24} />, color: '#06b6d4' },
            { title: 'System Settings', desc: 'Configure platform settings', href: '#', icon: <Settings size={24} />, color: '#10b981' },
          ].map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="card"
              style={{ padding: 24, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 18 }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0, border: `1px solid ${item.color}44` }}>
                {item.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
