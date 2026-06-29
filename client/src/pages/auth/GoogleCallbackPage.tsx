/**
 * Google OAuth Callback Page
 *
 * After Google verifies the user, backend redirects here with:
 *   /auth/google/callback?accessToken=...&refreshToken=...&role=...
 *
 * This page extracts the tokens, stores them, and redirects to the dashboard.
 * Uses useEffect to run once on mount.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { connectSocket } from '../../lib/socket';
import api from '../../lib/api';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const processed = useRef(false); // Prevent double-processing in strict mode

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const role = searchParams.get('role');
    const error = searchParams.get('error');

    if (error) {
      const messages: Record<string, string> = {
        google_denied: 'Google sign-in was cancelled.',
        invalid_state: 'Invalid OAuth state. Please try again.',
        oauth_failed: 'Google sign-in failed. Please try again.',
      };
      toast.error(messages[error] || 'Google sign-in failed.');
      navigate('/auth/login', { replace: true });
      return;
    }

    if (!accessToken || !refreshToken || !role) {
      toast.error('Authentication failed. Please try again.');
      navigate('/auth/login', { replace: true });
      return;
    }

    // Fetch full user profile using the access token
    api
      .get('/auth/profile', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => {
        const user = res.data.data;
        setAuth(user, accessToken, refreshToken);
        connectSocket();
        const profileData = user.studentProfile || user.profile;
        toast.success(`Welcome, ${profileData?.name || user.email}!`);

        // Redirect based on role and profile completion
        if (user.role === 'ADMIN') navigate('/admin/dashboard', { replace: true });
        else if (user.role === 'COMMITTEE' || user.role === 'WARDEN') navigate('/committee/dashboard', { replace: true });
        else {
          if (!profileData) {
            navigate('/auth/complete-profile', { replace: true });
          } else {
            navigate('/student/dashboard', { replace: true });
          }
        }
      })
      .catch(() => {
        // Fallback: use role from URL if profile fetch fails
        setAuth({ id: '', email: '', role: role as any, primaryRole: role as any, isEmailVerified: true, profile: null }, accessToken, refreshToken);
        connectSocket();
        if (role === 'ADMIN') navigate('/admin/dashboard', { replace: true });
        else if (role === 'COMMITTEE' || role === 'WARDEN') navigate('/committee/dashboard', { replace: true });
        else navigate('/auth/complete-profile', { replace: true }); // Assume missing profile on failure for safety
      });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8eef5 0%, #f0f4f8 50%, #ddeaf5 100%)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            background: 'var(--gradient-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 8px 28px rgba(43, 127, 196, 0.35)',
          }}
        >
          <Building2 size={34} color="white" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Signing you in with Google...
          </p>
        </div>
      </div>
    </div>
  );
}
