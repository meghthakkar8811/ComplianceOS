import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/auth.css';

export default function SignupView({ onNavigateToLogin, onNavigateToVerify }) {
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength scoring
  const getPasswordStrength = (pw) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { pct: '20%', color: '#e74c3c', label: 'Too weak' },
      { pct: '40%', color: '#e74c3c', label: 'Weak' },
      { pct: '60%', color: '#f0a500', label: 'Fair' },
      { pct: '80%', color: '#e8a020', label: 'Good' },
      { pct: '100%', color: '#2ecc71', label: 'Strong' },
    ];
    return levels[Math.min(score, 4)];
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const body = {
      company_name: companyName.trim(),
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    };

    try {
      const res = await fetch('/backend/auth/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        localStorage.setItem('cos_pending_email', body.email);
        if (data.debug_code) {
          localStorage.setItem('cos_pending_code', data.debug_code);
          setSuccessMsg(`Account created! (Dev mode: OTP ${data.debug_code})`);
        } else {
          setSuccessMsg('Account created! Check your email for verification code.');
        }
        setTimeout(() => {
          if (onNavigateToVerify) onNavigateToVerify(body.email);
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Registration failed. Please try again.');
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

      <div className="auth-wrap">
        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-logo">
            <div className="logo-hex">⬡</div>
            <div>
              <div className="logo-name">ComplianceOS</div>
              <div className="logo-tag">Mining Compliance Platform</div>
            </div>
          </div>
          <h1 className="auth-headline">
            Start your<br />
            <span className="headline-amber">compliance journey.</span>
          </h1>
          <p className="auth-sub">
            Set up your mining company in 2 minutes. Your first mine's compliance calendar auto-generates on signup.
          </p>
          <div className="auth-features">
            <div className="af-item"><span className="af-dot green" />Free 14-day trial — no credit card</div>
            <div className="af-item"><span className="af-dot amber" />Onboard your first mine in 5 minutes</div>
            <div className="af-item"><span className="af-dot blue" />Compliance calendar auto-generated</div>
            <div className="af-item"><span className="af-dot purple" />WhatsApp alerts activated immediately</div>
          </div>
          <div className="plan-preview">
            <div className="pp-label">Starting on Starter Plan</div>
            <div className="pp-price">₹9,999<span>/month</span></div>
            <div className="pp-note">After your 14-day free trial</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>Create your account</h2>
              <p>Set up ComplianceOS for your mining company</p>
            </div>

            <div className="auth-divider"><span>create account with email</span></div>

            {errorMsg && <div className="msg-box error" style={{ display: 'flex', marginBottom: '14px' }}>{errorMsg}</div>}
            {successMsg && <div className="msg-box success" style={{ display: 'flex', marginBottom: '14px' }}>{successMsg}</div>}

            <form onSubmit={handleSubmit} id="signup-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Full Name <span className="req">*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Mahesh Thakkar"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrap">
                    <span className="input-icon">📱</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98XXX XXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Company / Mining Firm Name <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">🏢</span>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Thakkar Mining Private Limited"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Work Email Address <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mahesh@thakkarmining.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
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
                {strength && (
                  <div className="password-strength" style={{ display: 'flex' }}>
                    <div className="pw-bar-wrap">
                      <div className="pw-bar" style={{ width: strength.pct, background: strength.color }} />
                    </div>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Confirm Password <span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <label className="checkbox-label" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to the <a href="javascript:void(0)">Terms of Service</a> and <a href="javascript:void(0)">Privacy Policy</a>
                </span>
              </label>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Creating Account…' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
              Already have an account?{' '}
              <a href="javascript:void(0)" onClick={onNavigateToLogin}>
                Sign in →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

