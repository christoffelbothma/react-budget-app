import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import budgetrLogo from '../assets/budgetr-logo.svg';
import { getLoginErrorMessage } from '../lib/authErrors.js';
import { APP_VERSION } from '../version';
import ThemeToggle from './ThemeToggle.jsx';

export default function Login({ theme, onShowRegister, onThemeToggle }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('email', email.trim().toLowerCase());
      formData.set('password', password);
      formData.set('flow', 'signIn');
      await signIn('password', formData);
      setMessage('You are signed in.');
    } catch (error) {
      setMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="BudgetR overview">
        <div className="brand-content">
          <p className="eyebrow">BudgetR</p>
          <h1>Stay close to every rand.</h1>
        </div>

        <div className="balance-preview" aria-hidden="true">
          <div className="preview-row">
            <span>Monthly budget</span>
            <strong>R 0</strong>
          </div>
          <div className="meter">
            <span />
          </div>
          <div className="preview-grid">
            <div>
              <span>Saved</span>
              <strong>R 4,280</strong>
            </div>
            <div>
              <span>Left</span>
              <strong>R 7,940</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <img src={budgetrLogo} alt="BudgetR" className="login-logo" />

        <div className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Welcome back</p>
            <h2 id="login-title">Log in to BudgetR</h2>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              required
            />

            <div className="field-topline">
              <label htmlFor="password">Password</label>
              <span>Secure sign-in</span>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <label className="check-row">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>

            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            {message && <p className="form-message" role="alert" aria-live="polite">{message}</p>}
          </form>

          <div className="login-theme-row">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          </div>

          <p className="signup-note">
            New to BudgetR?{' '}
            <button className="text-action" type="button" onClick={onShowRegister}>
              Create an account
            </button>
          </p>
          <p className="version-note">v{APP_VERSION}</p>
        </div>
      </section>
    </main>
  );
}
