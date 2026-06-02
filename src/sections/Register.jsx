import { useState } from 'react';
import budgetrLogo from '../assets/budgetr-logo.svg';
import { supabase } from '../lib/supabaseClient';
import { APP_VERSION } from '../version';
import ThemeToggle from './ThemeToggle.jsx';

export default function Register({ theme, onShowLogin, onThemeToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setIsVerificationSent(true);
      setMessage('Check your email to verify your account before logging in.');
    }

    setIsSubmitting(false);
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="BudgetR account setup">
        <div className="brand-content">
          <p className="eyebrow">BudgetR</p>
          <h1>Start tracking with intent.</h1>
        </div>

        <div className="balance-preview" aria-hidden="true">
          <div className="preview-row">
            <span>First budget</span>
            <strong>R 18,500</strong>
          </div>
          <div className="meter">
            <span />
          </div>
          <div className="preview-grid">
            <div>
              <span>Categories</span>
              <strong>6 ready</strong>
            </div>
            <div>
              <span>Setup</span>
              <strong>Email</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="register-title">
        <img src={budgetrLogo} alt="BudgetR" className="login-logo" />

        <div className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Create account</p>
            <h2 id="register-title">Join BudgetR</h2>
          </div>

          {isVerificationSent ? (
            <div className="verification-panel">
              <strong>Verify your email</strong>
              <p>{message}</p>
              <button className="primary-action" type="button" onClick={onShowLogin}>
                Back to login
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label htmlFor="register-confirm-password">Confirm password</label>
              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <button className="primary-action" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>

              {message && <p className="form-message">{message}</p>}
            </form>
          )}

          <div className="login-theme-row">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          </div>

          <p className="signup-note">
            Already have an account?{' '}
            <button className="text-action" type="button" onClick={onShowLogin}>
              Log in
            </button>
          </p>
          <p className="version-note">v{APP_VERSION}</p>
        </div>
      </section>
    </main>
  );
}
