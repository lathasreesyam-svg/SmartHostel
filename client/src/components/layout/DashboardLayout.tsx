import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <main>{children}</main>
      </div>
    </div>
  );
}
