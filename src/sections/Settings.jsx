import { MoonStar, Palette, ShieldCheck, Sun } from 'lucide-react';
import { APP_VERSION } from '../version';

export default function Settings({ theme, onThemeChange }) {
  return (
    <div className="settings-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Make BudgetR yours</h2>
        </div>
        <span className="status-pill">v{APP_VERSION}</span>
      </header>

      <section className="settings-grid">
        <article className="table-panel settings-card">
          <div className="panel-title">
            <div><h3>Appearance</h3><span>Choose the theme used while signed in</span></div>
            <Palette size={21} />
          </div>
          <div className="theme-choice" role="group" aria-label="Colour theme">
            <button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => onThemeChange('light')}>
              <Sun size={20} /><span><strong>Light</strong><small>Warm and bright</small></span>
            </button>
            <button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => onThemeChange('dark')}>
              <MoonStar size={20} /><span><strong>Dark</strong><small>Easy on the eyes</small></span>
            </button>
          </div>
        </article>

        <article className="table-panel settings-card">
          <div className="panel-title">
            <div><h3>Your data</h3><span>Private by design</span></div>
            <ShieldCheck size={21} />
          </div>
          <p>Your expenses, budgets, and debit orders are tied to your signed-in account. Statement files are not kept in your account after processing.</p>
          <dl className="settings-list">
            <div><dt>Currency</dt><dd>South African rand (ZAR)</dd></div>
            <div><dt>Statement imports</dt><dd>CSV and text-based PDF</dd></div>
            <div><dt>App version</dt><dd>{APP_VERSION}</dd></div>
          </dl>
        </article>
      </section>
    </div>
  );
}
