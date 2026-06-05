import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// Student pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const ComplaintsPage = lazy(() => import('./pages/student/ComplaintsPage'));
const RebatesPage = lazy(() => import('./pages/student/RebatesPage'));
const MenuPage = lazy(() => import('./pages/student/MenuPage'));
const AttendancePage = lazy(() => import('./pages/student/AttendancePage'));
const NotificationsPage = lazy(() => import('./pages/student/NotificationsPage'));
const PaymentsPage = lazy(() => import('./pages/student/PaymentsPage'));
const ChatPage = lazy(() => import('./pages/student/ChatPage'));

// Committee pages
const CommitteeDashboard = lazy(() => import('./pages/committee/CommitteeDashboard'));
const CommitteeComplaintsPage = lazy(() => import('./pages/committee/CommitteeComplaintsPage'));
const CommitteeRebatesPage = lazy(() => import('./pages/committee/CommitteeRebatesPage'));
const CommitteeMenuPage = lazy(() => import('./pages/committee/CommitteeMenuPage'));
const InventoryPage = lazy(() => import('./pages/committee/InventoryPage'));
const AnalyticsPage = lazy(() => import('./pages/committee/AnalyticsPage'));
const CommitteeNotificationsPage = lazy(() => import('./pages/committee/CommitteeNotificationsPage'));
const WorkersPage = lazy(() => import('./pages/committee/WorkersPage'));
const AttendanceScanPage = lazy(() => import('./pages/committee/AttendanceScanPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const BlocksPage = lazy(() => import('./pages/admin/BlocksPage'));
const AdminInventoryPage = lazy(() => import('./pages/committee/InventoryPage'));
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage'));
const AdminRebatesPage = lazy(() => import('./pages/admin/AdminRebatesPage'));
const AdminAttendancePage = lazy(() => import('./pages/admin/AdminAttendancePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FeedbackPage = lazy(() => import('./pages/committee/FeedbackPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', margin: '0 auto 12px' }} className="animate-spin" />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute roles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/complaints" element={
              <ProtectedRoute roles={['STUDENT']}>
                <ComplaintsPage />
              </ProtectedRoute>
            } />
            <Route path="/student/rebates" element={
              <ProtectedRoute roles={['STUDENT']}>
                <RebatesPage />
              </ProtectedRoute>
            } />
            <Route path="/student/menu" element={
              <ProtectedRoute roles={['STUDENT']}>
                <MenuPage />
              </ProtectedRoute>
            } />
            <Route path="/student/attendance" element={
              <ProtectedRoute roles={['STUDENT']}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/student/notifications" element={
              <ProtectedRoute roles={['STUDENT']}>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/student/payments" element={
              <ProtectedRoute roles={['STUDENT']}>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            <Route path="/student/chat" element={
              <ProtectedRoute roles={['STUDENT']}>
                <ChatPage />
              </ProtectedRoute>
            } />

            {/* Committee Routes */}
            <Route path="/committee/dashboard" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <CommitteeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/committee/complaints" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <CommitteeComplaintsPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/rebates" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <CommitteeRebatesPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/menu" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <CommitteeMenuPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/inventory" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/analytics" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <AnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/notifications" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN']}>
                <CommitteeNotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/workers" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN', 'ADMIN']}>
                <WorkersPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/feedback" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN', 'ADMIN']}>
                <FeedbackPage />
              </ProtectedRoute>
            } />
            <Route path="/committee/attendance/scan" element={
              <ProtectedRoute roles={['COMMITTEE', 'WARDEN', 'ADMIN']}>
                <AttendanceScanPage />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/blocks" element={
              <ProtectedRoute roles={['ADMIN']}>
                <BlocksPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/inventory" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminInventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/complaints" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminComplaintsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/rebates" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminRebatesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/attendance" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminAttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/workers" element={
              <ProtectedRoute roles={['ADMIN']}>
                <WorkersPage />
              </ProtectedRoute>
            } />

            {/* Shared Profile Route */}
            <Route path="/profile" element={
              <ProtectedRoute roles={['STUDENT', 'COMMITTEE', 'WARDEN', 'ADMIN']}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 16px rgba(15,42,69,0.12)',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
