import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { connectSocket } from '../../lib/socket';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      connectSocket();

      toast.success(`Welcome back, ${user.profile?.name || user.email}!`);

      // Route based on role
      if (user.role === 'STUDENT') navigate('/student/dashboard');
      else if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/committee/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8eef5 0%, #f0f4f8 50%, #ddeaf5 100%)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative orbs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          opacity: 0.08,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          opacity: 0.07,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="animate-fade-in"
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: 'var(--gradient-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 28px rgba(43, 127, 196, 0.35)',
            }}
          >
            <Building2 size={34} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6 }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Sign in to your SmartHostel account
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: '0 8px 32px rgba(15, 42, 69, 0.1)',
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
                type="email"
                className="form-input"
                placeholder="you@university.edu"
                autoComplete="email"
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                to="/auth/forgot-password"
                style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
              style={{ width: '100%', marginTop: 4 }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link
              to="/auth/register"
              style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: 20,
            padding: '14px 20px',
            background: 'rgba(43, 127, 196, 0.06)',
            border: '1px solid rgba(43, 127, 196, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-primary)', fontSize: 13 }}>
            🔑 Demo Credentials
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <div>👤 Student: <strong>student@demo.com</strong> / Student@123</div>
            <div>🏛️ Committee: <strong>committee@demo.com</strong> / Committee@123</div>
            <div>⚙️ Admin: <strong>admin@demo.com</strong> / Admin@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
