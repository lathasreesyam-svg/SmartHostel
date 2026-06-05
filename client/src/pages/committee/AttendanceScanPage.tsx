import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, CheckCircle, XCircle, Camera, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

interface ScanResult {
  success: boolean;
  data?: {
    user?: { studentProfile?: { name: string; rollNumber: string } };
    schedule?: { mealType: string };
    scannedAt?: string;
    status?: string;
  };
  error?: string;
}

export default function AttendanceScanPage() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [, setScannerReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: (token: string) => api.post('/attendance/qr/scan', { token }),
    onSuccess: (res) => {
      const d = res.data.data;
      setLastResult({ success: true, data: d });
      toast.success(`✅ Attendance marked for ${d?.user?.studentProfile?.name || 'student'}!`);
      qc.invalidateQueries({ queryKey: ['all-attendance'] });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Invalid or expired QR code';
      setLastResult({ success: false, error: msg });
      toast.error(msg);
    },
  });

  const handleScan = (token: string) => {
    if (!token || scanMutation.isPending) return;
    const cleaned = token.trim();
    if (!cleaned) return;
    scanMutation.mutate(cleaned);
  };

  const startCamera = async () => {
    try {
      // Dynamically import html5-qrcode
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      if (scannerRef.current) {
        await scannerRef.current.clear();
        scannerRef.current = null;
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText: string) => {
          // Only trigger once per scan
          if (!scanMutation.isPending) {
            handleScan(decodedText);
          }
        },
        () => {} // ignore errors
      );

      scannerRef.current = scanner;
      setScannerReady(true);
      setScanning(true);
    } catch (err: any) {
      // html5-qrcode not installed fallback
      toast.error('Camera scanner not available. Use manual token entry below.');
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
    setScannerReady(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const MEAL_LABELS: Record<string, string> = {
    BREAKFAST: '🌅 Breakfast',
    LUNCH: '☀️ Lunch',
    SNACKS: '🍎 Snacks',
    DINNER: '🌙 Dinner',
  };

  return (
    <DashboardLayout>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Scan Attendance</h1>
          <p className="page-subtitle">Scan student QR codes to mark meal attendance</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {/* Scanner Panel */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={18} color="var(--color-primary-light)" />
              Camera Scanner
            </h3>

            {!scanning ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 120, height: 120, borderRadius: 16,
                  background: 'var(--color-primary-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <QrCode size={48} color="var(--color-primary)" />
                </div>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Use your phone camera to scan a student's QR code and instantly record their meal attendance.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={startCamera}>
                  <Camera size={16} /> Start Camera Scanner
                </button>
              </div>
            ) : (
              <div>
                {/* html5-qrcode renders into this div */}
                <div
                  id="qr-reader"
                  ref={scannerDivRef}
                  style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
                />
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={stopCamera}
                >
                  <XCircle size={16} /> Stop Scanner
                </button>
                {scanMutation.isPending && (
                  <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--color-primary-light)', fontSize: 14, fontWeight: 600 }}>
                    Processing scan...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Token Entry + Result */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Manual Entry */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={18} color="var(--color-primary-light)" />
                Manual Token Entry
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>
                Paste the QR token string directly if camera is not available.
              </p>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">QR Token</label>
                <textarea
                  className="form-input form-textarea"
                  rows={3}
                  placeholder="Paste the QR token here..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!manualToken.trim() || scanMutation.isPending}
                onClick={() => { handleScan(manualToken); setManualToken(''); }}
              >
                {scanMutation.isPending ? 'Processing...' : 'Submit Token'}
              </button>
            </div>

            {/* Last Scan Result */}
            {lastResult && (
              <div
                className="card animate-fade-in"
                style={{
                  padding: 24,
                  borderColor: lastResult.success ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                  background: lastResult.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  {lastResult.success ? (
                    <CheckCircle size={28} color="#10b981" />
                  ) : (
                    <XCircle size={28} color="#ef4444" />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {lastResult.success ? 'Attendance Recorded!' : 'Scan Failed'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {lastResult.success ? 'Successfully marked as present' : lastResult.error}
                    </div>
                  </div>
                </div>

                {lastResult.success && lastResult.data && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, fontSize: 14 }}>
                      <strong>Student:</strong>{' '}
                      {lastResult.data.user?.studentProfile?.name || 'Unknown'}
                      {lastResult.data.user?.studentProfile?.rollNumber && (
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 12 }}>
                          ({lastResult.data.user.studentProfile.rollNumber})
                        </span>
                      )}
                    </div>
                    {lastResult.data.schedule?.mealType && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, fontSize: 14 }}>
                        <strong>Meal:</strong>{' '}
                        {MEAL_LABELS[lastResult.data.schedule.mealType] || lastResult.data.schedule.mealType}
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => setLastResult(null)}
                >
                  <RotateCcw size={14} /> Clear Result
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>How it works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { step: '1', title: 'Student generates QR', desc: 'Student goes to Attendance page and generates a QR code for their selected meal', color: '#6366f1' },
              { step: '2', title: 'Show at counter', desc: 'Student shows the QR code on their phone screen at the mess counter', color: '#f59e0b' },
              { step: '3', title: 'Committee scans', desc: 'Committee member opens this page and scans with camera or enters the token', color: '#10b981' },
              { step: '4', title: 'Instant record', desc: 'Attendance is instantly recorded in the registry for that student and meal', color: '#3b82f6' },
            ].map((item) => (
              <div key={item.step} style={{ padding: 16, background: `${item.color}10`, borderRadius: 12, border: `1px solid ${item.color}25` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  {item.step}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: item.color }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
