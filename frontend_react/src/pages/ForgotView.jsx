import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/auth.css';

export default function ForgotView({ onNavigateToLogin }) {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState('email'); // 'email' or 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/backend/auth/forgot_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessMsg('Reset code sent! Please check your email.');
        setStep('reset');
      } else {
        setErrorMsg(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      setErrorMsg('Connection failed. Please ensure the backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const copy = [...otpDigits];
    copy[idx] = clean;
    setOtpDigits(copy);

    if (clean && idx < 5) {
      const nextInput = document.getElementById(`rotp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the reset code');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/backend/auth/reset_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          code,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessMsg('Password reset successfully! Redirecting to login…');
        setTimeout(() => {
          onNavigateToLogin();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Password reset failed');
      }
    } catch (err) {
      setErrorMsg('Connection failed. Please ensure the backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-body-wrap" style={{ minHeight: '100vh', position: 'relative' }}>
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title="Toggle Dark/Light Mode"
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}
      >
        {theme === 'dark' ? '☀' : '🌙'}
      </button>

      <div className="auth-bg">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow" />
      </div>

      <div className="auth-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
        {step === 'email' ? (
          <div className="auth-card verify-card" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="verify-icon" style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🔑</div>
            <h2 style={{ textAlign: 'center' }}>Reset your password</h2>
            <p className="verify-sub" style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '13px', marginBottom: '20px' }}>
              Enter your email and we'll send a 6-digit reset code.
            </p>

            {errorMsg && <div className="msg-box error" style={{ display: 'flex', marginBottom: '14px' }}>{errorMsg}</div>}
            {successMsg && <div className="msg-box success" style={{ display: 'flex', marginBottom: '14px' }}>{successMsg}</div>}

            <form onSubmit={handleSendCode}>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary full-w" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
                {loading ? 'Sending Code…' : 'Send Reset Code'}
              </button>
            </form>
            <div className="auth-footer" style={{ marginTop: '18px', textAlign: 'center' }}>
              <a href="javascript:void(0)" onClick={onNavigateToLogin}>← Back to Sign In</a>
            </div>
          </div>
        ) : (
          <div className="auth-card verify-card" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="verify-icon" style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ textAlign: 'center' }}>Enter your reset code</h2>
            <p className="verify-sub" style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '13px', marginBottom: '20px' }}>
              Check <strong>{resetEmail}</strong> for the 6-digit code.
            </p>

            {errorMsg && <div className="msg-box error" style={{ display: 'flex', marginBottom: '14px' }}>{errorMsg}</div>}
            {successMsg && <div className="msg-box success" style={{ display: 'flex', marginBottom: '14px' }}>{successMsg}</div>}

            <form onSubmit={handleResetSubmit}>
              <div className="otp-wrap" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                {otpDigits.slice(0, 3).map((d, i) => (
                  <input
                    key={i}
                    id={`rotp-${i}`}
                    className="otp-input"
                    type="text"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    style={{ width: '42px', height: '48px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                  />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text2)' }}>—</div>
                {otpDigits.slice(3, 6).map((d, i) => (
                  <input
                    key={i + 3}
                    id={`rotp-${i + 3}`}
                    className="otp-input"
                    type="text"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(e.target.value, i + 3)}
                    style={{ width: '42px', height: '48px', textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
                  />
                ))}
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary full-w" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
                {loading ? 'Resetting Password…' : 'Reset Password'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: '18px', textAlign: 'center' }}>
              <a href="javascript:void(0)" onClick={onNavigateToLogin}>← Back to Sign In</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

