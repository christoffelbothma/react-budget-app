import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, X } from 'lucide-react';
import Dashboard from './sections/Dashboard.jsx';
import Login from './sections/Login.jsx';
import MonthCalendar from './sections/MonthCalendar.jsx';
import Products from './sections/Products.jsx';
import QuickAdd from './sections/QuickAdd.jsx';
import Register from './sections/Register.jsx';
import { supabase } from './lib/supabaseClient';
import './style.css';

function App() {
  const [session, setSession] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const [authView, setAuthView] = useState('login');
  const [theme, setTheme] = useState(() => localStorage.getItem('budgetr-theme') || 'light');
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('budgetr-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');

    function handleMediaChange(event) {
      setIsMobile(event.matches);
      setIsSidebarOpen(!event.matches);
    }

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

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

  useEffect(() => {
    async function loadTransactions() {
      if (!session?.user?.id) {
        setTransactions([]);
        return;
      }

      setIsLoadingTransactions(true);
      setTrackingError('');

      const { data, error } = await supabase
        .from('transactions')
        .select('id, name, amount, transaction_date, categories(name)')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        setTrackingError(error.message);
      } else {
        setTransactions(
          data.map((transaction) => ({
            amount: Number(transaction.amount),
            category: transaction.categories?.name || 'General',
            date: transaction.transaction_date,
            id: transaction.id,
            name: transaction.name,
          })),
        );
      }

      setIsLoadingTransactions(false);
    }

    loadTransactions();
  }, [session]);

  async function handleAddTransaction(transaction) {
    if (session?.user?.id) {
      const { data, error } = await supabase.from('transactions').insert({
        amount: transaction.amount,
        name: transaction.name,
        transaction_date: new Date().toISOString().slice(0, 10),
        user_id: session.user.id,
      }).select('id, name, amount, transaction_date, categories(name)').single();

      if (error) {
        setTrackingError(error.message);
        return;
      }

      setTrackingError('');
      setTransactions((currentTransactions) => [
        {
          amount: Number(data.amount),
          category: data.categories?.name || 'General',
          date: data.transaction_date,
          id: data.id,
          name: data.name,
        },
        ...currentTransactions,
      ]);
      return;
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  function handleNavChange(view) {
    setActiveView(view);

    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }

  if (!session) {
    if (authView === 'register') {
      return (
        <Register
          theme={theme}
          onShowLogin={() => setAuthView('login')}
          onThemeToggle={handleThemeToggle}
        />
      );
    }

    return (
      <Login
        theme={theme}
        onShowRegister={() => setAuthView('register')}
        onThemeToggle={handleThemeToggle}
      />
    );
  }

  return (
    <main
      className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'} ${
        isMobile ? 'mobile-shell' : 'desktop-shell'
      }`}
    >
      <button
        className="menu-toggle"
        type="button"
        onClick={() => setIsSidebarOpen((currentState) => !currentState)}
        aria-label={isSidebarOpen ? 'Collapse side menu' : 'Expand side menu'}
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {isMobile && isSidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close side menu"
        />
      )}

      <aside className="app-sidebar">
        <div>
          <p className="eyebrow">BudgetR</p>
          <h1>Money map</h1>
        </div>
        <nav className="app-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => handleNavChange('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'months' ? 'active' : ''}
            onClick={() => handleNavChange('months')}
          >
            Months
          </button>
          <button
            type="button"
            className={activeView === 'products' ? 'active' : ''}
            onClick={() => handleNavChange('products')}
          >
            Products
          </button>
        </nav>
        <button className="sign-out-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {trackingError && <p className="form-message">{trackingError}</p>}
        {activeView === 'dashboard' && (
          <Dashboard isLoading={isLoadingTransactions} transactions={transactions} />
        )}
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
