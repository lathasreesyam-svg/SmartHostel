import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { connectSocket } from '../../lib/socket';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const userId = searchParams.get('userId') || '';
  const email  = searchParams.get('email')  || 'your email';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start cooldown on mount so user can't immediately spam resend
  useEffect(() => {
    startCooldown();
    // auto-focus first input
    inputRefs.current[0]?.focus();
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
  }

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      toast.error('Missing user info. Please register again.');
      navigate('/auth/register');
    }
  }, [userId, navigate]);

  function handleChange(index: number, value: string) {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1 && next.every((d) => d !== '')) {
      submitOtp(next.join(''));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // clear current
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // move back
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    // focus last filled or last
    const lastIdx = Math.min(pasted.length - 1, OTP_LENGTH - 1);
    inputRefs.current[lastIdx]?.focus();
    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    }
  }

  async function submitOtp(otp: string) {
    if (otp.length !== OTP_LENGTH) return;
    setIsVerifying(true);
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      connectSocket();
      toast.success('Email verified! Welcome to SmartHostel 🎉');
      if (user.role === 'STUDENT' || user.primaryRole === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'COMMITTEE') {
        navigate('/committee/dashboard');
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(msg);
      // Clear inputs on error
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await api.post('/auth/resend-otp', { userId });
      toast.success(res.data.message || 'A new OTP has been sent!');
      // Dev mode: auto-fill the devOtp
      if (res.data.devOtp) {
        const devDigits = res.data.devOtp.split('');
        setDigits(devDigits);
        toast('Dev mode: OTP auto-filled', { icon: '🛠️' });
      }
      startCooldown();
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP. Try again.');
    } finally {
      setIsResending(false);
    }
  }

  const otp = digits.join('');
  const isFilled = otp.length === OTP_LENGTH;

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
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '15%', right: '8%', width: 380, height: 380, borderRadius: '50%', background: 'var(--color-secondary)', opacity: 0.05, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.04, filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(43,127,196,0.3)' }}>
            <Mail size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Check your email</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            We've sent a 6-digit verification code to<br />
            <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 32px',
            boxShadow: '0 8px 32px rgba(15, 42, 69, 0.1)',
          }}
        >
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28 }}>
            Enter the 6-digit code below
          </p>

          {/* OTP Input Boxes */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                id={`otp-digit-${i}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                style={{
                  width: 52,
                  height: 60,
                  textAlign: 'center',
                  fontSize: 26,
                  fontWeight: 800,
                  border: digit
                    ? '2px solid var(--color-primary)'
                    : '2px solid var(--color-border)',
                  borderRadius: 12,
                  background: digit ? 'rgba(43, 127, 196, 0.06)' : '#f8fafc',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s, transform 0.1s',
                  transform: digit ? 'scale(1.05)' : 'scale(1)',
                  cursor: 'text',
                  caretColor: 'transparent',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(43,127,196,0.15)';
                }}
                onBlur={(e) => {
                  if (!digit) e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={isVerifying}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            id="verify-otp-btn"
            onClick={() => submitOtp(otp)}
            disabled={!isFilled || isVerifying}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: 16 }}
          >
            {isVerifying ? (
              <><Loader2 size={18} className="animate-spin" /> Verifying...</>
            ) : (
              '✅ Verify Email'
            )}
          </button>

          {/* Resend Section */}
          <div style={{ textAlign: 'center' }}>
            {cooldown > 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Resend code in <strong style={{ color: 'var(--color-primary)' }}>{cooldown}s</strong>
              </p>
            ) : (
              <button
                id="resend-otp-btn"
                onClick={handleResend}
                disabled={isResending}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(43,127,196,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Sending...' : "Didn't receive it? Resend"}
              </button>
            )}
          </div>

          <div className="divider" style={{ margin: '20px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Wrong email?{' '}
            <a
              href="/auth/register"
              style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Register again
            </a>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
          The code expires in 10 minutes. Check your spam folder if you don't see it.
        </p>
      </div>
    </div>
  );
}
