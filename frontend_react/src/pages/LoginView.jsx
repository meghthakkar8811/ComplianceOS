import React, { useState } from 'react';
import { apiFetch } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import '../styles/auth.css';

export default function LoginView({ onLoginSuccess }) {
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ type: 'password', username: username.trim(), password }),
      });
      setSuccessMsg('Sign in successful! Redirecting…');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err) {
      setErrorMsg(
        err.status === 401
          ? 'Invalid email or password'
          : 'Connection failed. Please ensure the backend is running.'
      );
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

      <div className="auth-wrap">
        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="auth-logo">
            <div className="logo-hex">⬡</div>
            <div>
              <div className="logo-name">ComplianceOS</div>
              <div className="logo-tag">Mining Compliance Platform</div>
            </div>
          </div>
          <h1 className="auth-headline">
            Statutory compliance,<br />
            <span className="headline-amber">automated.</span>
          </h1>
          <p className="auth-sub">
            IBM Form B. Royalty calculations. DGMS readiness. All in one platform built for Indian mining companies.
          </p>
          <div className="auth-features">
            <div className="af-item"><span className="af-dot green" />IBM Form B auto-fill in 20 minutes</div>
            <div className="af-item"><span className="af-dot amber" />Live royalty calculator — 8 states</div>
            <div className="af-item"><span className="af-dot blue" />DGMS inspection readiness score</div>
            <div className="af-item"><span className="af-dot purple" />Document expiry alerts via WhatsApp</div>
          </div>
          <div className="auth-trust">
            <div className="trust-stat"><span className="ts-num">8</span><span className="ts-label">States</span></div>
            <div className="trust-divider" />
            <div className="trust-stat"><span className="ts-num">8</span><span className="ts-label">Minerals</span></div>
            <div className="trust-divider" />
            <div className="trust-stat"><span className="ts-num">∞</span><span className="ts-label">Compliance Calendar</span></div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>Welcome back</h2>
              <p>Sign in to your ComplianceOS account</p>
            </div>

            <a
              className="btn-google"
              href="javascript:void(0)"
              onClick={() => setErrorMsg('Google sign-in is coming soon.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>

            <div className="auth-divider"><span>or sign in with email</span></div>

            {errorMsg && (
              <div className="msg-box error" style={{ display: 'flex', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="msg-box success" style={{ display: 'flex', marginBottom: '16px' }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} id="login-form">
              <div className="form-group">
                <label>Username</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Password</label>
                  <a className="forgot-link" href="#forgot">Forgot password?</a>
                </div>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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

              <div className="form-row-2">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
                {loading ? 'Signing In…' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
              Don't have an account? <span style={{ color: 'var(--accent)' }}>Create one free →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
