import { useState } from 'react';
import budgetrLogo from '../assets/budgetr-logo.svg';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setMessage(error ? error.message : 'You are signed in.');
    setIsSubmitting(false);
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
            <strong>R 18,500</strong>
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
              required
            />

            <div className="field-topline">
              <label htmlFor="password">Password</label>
              <a href="#reset">Forgot?</a>
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

            {message && <p className="form-message">{message}</p>}
          </form>

          <p className="signup-note">
            New to BudgetR? <a href="#create-account">Create an account</a>
          </p>
        </div>
      </section>
    </main>
  );
}
