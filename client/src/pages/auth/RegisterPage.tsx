import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { connectSocket } from '../../lib/socket';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  department: string;
  year: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  role: 'STUDENT' | 'COMMITTEE';
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: 'STUDENT', year: 1, gender: 'MALE' },
  });

  const role = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', { ...data, year: Number(data.year) });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      connectSocket();
      toast.success('Registration successful! Welcome 🎉');
      navigate(user.role === 'STUDENT' ? '/student/dashboard' : '/committee/dashboard');
    } catch (error: any) {
      const errData = error.response?.data;
      if (errData?.errors?.length) {
        // Show all validation errors
        errData.errors.forEach((e: any) => toast.error(`${e.field}: ${e.message}`));
      } else {
        toast.error(errData?.message || 'Registration failed. Please check your details.');
      }
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
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'var(--color-secondary)', opacity: 0.04, filter: 'blur(80px)' }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Building2 size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Join the SmartHostel platform</p>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: '0 8px 32px rgba(15, 42, 69, 0.1)',
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select {...register('role')} className="form-input form-select">
                <option value="STUDENT">Student</option>
                <option value="COMMITTEE">Mess Committee</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input {...register('name', { required: 'Required' })} className="form-input" placeholder="John Doe" />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              {role === 'STUDENT' && (
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input {...register('rollNumber', { required: 'Required for students' })} className="form-input" placeholder="21CS001" />
                  {errors.rollNumber && <span className="form-error">{errors.rollNumber.message}</span>}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input {...register('email', { required: 'Required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })} type="email" className="form-input" placeholder="you@university.edu" />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                    pattern: { value: /^(?=.*[A-Z])(?=.*[0-9])/, message: 'Must include uppercase letter and number' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Min 8 characters · 1 uppercase · 1 number (e.g. Syam@123)</span>
            </div>

            {role === 'STUDENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input {...register('department')} className="form-input" placeholder="CSE" />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select {...register('year')} className="form-input form-select">
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select {...register('gender')} className="form-input form-select">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="divider" style={{ margin: '20px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/auth/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
