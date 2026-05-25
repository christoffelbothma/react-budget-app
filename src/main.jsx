import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './sections/Dashboard.jsx';
import Login from './sections/Login.jsx';
import MonthCalendar from './sections/MonthCalendar.jsx';
import Products from './sections/Products.jsx';
import QuickAdd from './sections/QuickAdd.jsx';
import { supabase } from './lib/supabaseClient';
import './style.css';

function App() {
  const [session, setSession] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('budgetr-theme') || 'light');
  const [transactions, setTransactions] = useState([
    { id: 1, name: 'Rent', category: 'Housing', amount: 8500, date: '2026-05-01' },
    { id: 2, name: 'Groceries', category: 'Food', amount: 3150, date: '2026-05-05' },
    { id: 3, name: 'Fuel', category: 'Transport', amount: 1280, date: '2026-05-09' },
    { id: 4, name: 'Internet', category: 'Utilities', amount: 899, date: '2026-05-12' },
    { id: 5, name: 'Coffee', category: 'Lifestyle', amount: 420, date: '2026-05-18' },
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('budgetr-theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleAddTransaction(transaction) {
    if (session?.user?.id) {
      await supabase.from('transactions').insert({
        amount: transaction.amount,
        name: transaction.name,
        transaction_date: new Date().toISOString().slice(0, 10),
        user_id: session.user.id,
      });
    }

    setTransactions((currentTransactions) => [
      {
        id: crypto.randomUUID(),
        category: 'General',
        date: new Date().toISOString().slice(0, 10),
        ...transaction,
      },
      ...currentTransactions,
    ]);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  if (!session) {
    return <Login theme={theme} onThemeToggle={handleThemeToggle} />;
  }

  return (
    <main className="app-layout">
      <aside className="app-sidebar">
        <div>
          <p className="eyebrow">BudgetR</p>
          <h1>Money map</h1>
        </div>
        <nav className="app-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'months' ? 'active' : ''}
            onClick={() => setActiveView('months')}
          >
            Months
          </button>
          <button
            type="button"
            className={activeView === 'products' ? 'active' : ''}
            onClick={() => setActiveView('products')}
          >
            Products
          </button>
        </nav>
        <button className="sign-out-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {activeView === 'dashboard' && <Dashboard transactions={transactions} />}
        {activeView === 'months' && <MonthCalendar transactions={transactions} />}
        {activeView === 'products' && <Products transactions={transactions} />}
      </section>

      <QuickAdd onSave={handleAddTransaction} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
