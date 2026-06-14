import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Building2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface ResetForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>();

  const password = watch('password');

  // Show error if no token in URL
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8eef5 0%, #f0f4f8 50%, #ddeaf5 100%)', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertTriangle size={48} color="#dc2626" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--color-text-primary)', marginBottom: 8 }}>Invalid reset link</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>This password reset link is invalid or has expired.</p>
          <Link to="/auth/forgot-password" className="btn btn-primary">Request a new link</Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetForm) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Reset failed. The link may have expired. Please request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: score, label: 'Weak', color: '#dc2626' };
    if (score === 2) return { level: score, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { level: score, label: 'Good', color: '#3b82f6' };
    return { level: score, label: 'Strong', color: '#16a34a' };
  };

  const strength = getStrength(password || '');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8eef5 0%, #f0f4f8 50%, #ddeaf5 100%)', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: 350, height: 350, borderRadius: '50%', background: 'var(--gradient-primary)', opacity: 0.08, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 280, height: 280, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.07, filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 28px rgba(43, 127, 196, 0.35)' }}>
            <Building2 size={34} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 6 }}>
            {success ? 'Password reset!' : 'Set new password'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            {success ? 'Redirecting you to login...' : 'Choose a strong password for your account'}
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, boxShadow: '0 8px 32px rgba(15, 42, 69, 0.1)' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <CheckCircle size={36} color="#16a34a" />
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Your password has been reset successfully. You'll be redirected to the login page in a moment.
              </p>
              <Link to="/auth/login" className="btn btn-primary">Go to login now</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* New Password */}
              <div className="form-group">
                <label className="form-label">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters' },
                      pattern: { value: /[A-Z]/, message: 'Must contain an uppercase letter' },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Create a strong password"
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.level ? strength.color : '#e2e8f0', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                )}
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">Confirm new password</label>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val) => val === password || 'Passwords do not match',
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repeat your new password"
                />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
                {isLoading ? <><Loader2 size={18} className="animate-spin" /> Resetting password...</> : '🔑 Reset password'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link to="/auth/login" style={{ fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
