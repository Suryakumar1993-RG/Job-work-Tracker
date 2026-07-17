// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(username.trim(), password);
    if (result.success) {
      showToast("Login Successful! Redirecting...", "success");
      setTimeout(() => navigate('/app/dashboard'), 500);
    } else {
      showToast(result.message, "error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-branding">
        <div className="login-branding-logo text-gradient">JobWork Tracker</div>
        <div className="login-branding-sub">
          End-to-End Outward Material Traceability, Real-Time Production Tracking at Vendor, Aging &amp; Non-Moving Analysis, and 120-Day Document Refresh Workflows.
        </div>
      </div>

      <div className="login-form-area">
        <div className="login-card glass animate-fade-in">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input type="text" id="username" className="form-control" placeholder="e.g. admin, manager, vendor"
                required autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" className="form-control" placeholder="••••••••"
                required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop: '25px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Sign In</button>
            </div>
          </form>

          <div style={{ marginTop: '25px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong>Demo Logins (User / Password):</strong><br/>
            • Admin (Full access): <code>admin</code> / <code>admin123</code><br/>
            • Store Manager: <code>manager</code> / <code>manager123</code><br/>
            • Store Operator: <code>operator</code> / <code>operator123</code><br/>
            • Job Worker (Vendor Portal): <code>vendor</code> / <code>vendor123</code><br/>
            • Auditor (View only): <code>viewer</code> / <code>viewer123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
