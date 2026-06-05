import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (roles && user) {
    // Allow access if the user's current role OR their original primaryRole is in the allowed list
    const hasAccess = roles.includes(user.role) || roles.includes(user.primaryRole);
    if (!hasAccess) {
      // Redirect to appropriate dashboard based on current elevated role
      const path =
        user.role === 'ADMIN' ? '/admin/dashboard' :
        user.role === 'COMMITTEE' || user.role === 'WARDEN' ? '/committee/dashboard' :
        '/student/dashboard';
      return <Navigate to={path} replace />;
    }
  }

  return <>{children}</>;
}
