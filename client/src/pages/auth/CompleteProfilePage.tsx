import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface ProfileForm {
  name: string;
  rollNumber: string;
  department: string;
  year: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
}

export default function CompleteProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { year: 1, gender: 'MALE', name: user?.email?.split('@')[0] || '' },
  });

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      const res = await api.patch('/auth/profile', { ...data, year: Number(data.year) });
      const updatedUser = res.data.data;
      
      // Update local store with the new profile
      setAuth(updatedUser, useAuthStore.getState().accessToken!, useAuthStore.getState().refreshToken!);
      
      toast.success('Profile completed successfully!');
      navigate('/student/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile.');
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
      }}
    >
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Building2 size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Complete Your Profile</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Just a few more details to get started</p>
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
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input {...register('name', { required: 'Required' })} className="form-input" placeholder="John Doe" />
              {errors.name && <span className="form-error">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input {...register('rollNumber', { required: 'Required for students' })} className="form-input" placeholder="21CS001" />
              {errors.rollNumber && <span className="form-error">{errors.rollNumber.message}</span>}
            </div>

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

            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <input {...register('phone')} className="form-input" placeholder="+1234567890" />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
