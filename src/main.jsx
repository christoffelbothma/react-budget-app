import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, X } from 'lucide-react';
import DebitOrders from './sections/DebitOrders.jsx';
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
  const [debitOrders, setDebitOrders] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [isDebitOrderStorageReady, setIsDebitOrderStorageReady] = useState(true);

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
    async function loadTrackingData() {
      if (!session?.user?.id) {
        setDebitOrders([]);
        setTransactions([]);
        return;
      }

      setIsLoadingTransactions(true);
      setTrackingError('');

      let transactionResponse = await supabase
        .from('transactions')
        .select('id, name, category, amount, transaction_date, tags, categories(name)')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (transactionResponse.error) {
        transactionResponse = await supabase
          .from('transactions')
          .select('id, name, amount, transaction_date, categories(name)')
          .eq('user_id', session.user.id)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const debitOrderResponse = await supabase
        .from('debit_orders')
        .select('id, name, category, tags, amount, day_of_month, auto_add_monthly')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (transactionResponse.error) {
        setTrackingError(transactionResponse.error.message);
      } else {
        setTransactions(
          transactionResponse.data.map((transaction) => ({
            amount: Number(transaction.amount),
            category: transaction.category || transaction.categories?.name || 'General',
            date: transaction.transaction_date,
            id: transaction.id,
            name: transaction.name,
            tags: transaction.tags || [],
          })),
        );
      }

      if (debitOrderResponse.error) {
        setDebitOrders([]);
        setIsDebitOrderStorageReady(false);
      } else {
        setIsDebitOrderStorageReady(true);
        setDebitOrders(
          debitOrderResponse.data.map((debitOrder) => ({
            amount: Number(debitOrder.amount),
            autoAddMonthly: debitOrder.auto_add_monthly,
            category: debitOrder.category,
            dayOfMonth: debitOrder.day_of_month,
            id: debitOrder.id,
            name: debitOrder.name,
            tags: debitOrder.tags || [],
          })),
        );
      }

      setIsLoadingTransactions(false);
    }

    loadTrackingData();
  }, [session]);

  useEffect(() => {
    async function autoAddDebitOrders() {
      if (!session?.user?.id || debitOrders.length === 0) {
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const existingNames = new Set(
        transactions
          .filter((transaction) => transaction.date?.startsWith(currentMonth))
          .map((transaction) => transaction.name),
      );
      const pendingDebitOrders = debitOrders.filter(
        (debitOrder) => debitOrder.autoAddMonthly && !existingNames.has(debitOrder.name),
      );

      for (const debitOrder of pendingDebitOrders) {
        await handleAddTransaction({
          amount: debitOrder.amount,
          category: debitOrder.category,
          name: debitOrder.name,
          tags: debitOrder.tags,
        });
      }
    }

    autoAddDebitOrders();
  }, [debitOrders, session]);

  async function handleAddTransaction(transaction) {
    if (session?.user?.id) {
      let response = await supabase.from('transactions').insert({
        amount: transaction.amount,
        category: transaction.category || 'General',
        category_id: transaction.categoryId || null,
        name: transaction.name,
        tags: transaction.tags || [],
        transaction_date: new Date().toISOString().slice(0, 10),
        user_id: session.user.id,
      }).select('id, name, category, amount, transaction_date, tags, categories(name)').single();

      if (response.error) {
        response = await supabase.from('transactions').insert({
          amount: transaction.amount,
          name: transaction.name,
          transaction_date: new Date().toISOString().slice(0, 10),
          user_id: session.user.id,
        }).select('id, name, amount, transaction_date, categories(name)').single();
      }

      if (response.error) {
        setTrackingError(response.error.message);
        return;
      }

      setTrackingError('');
      setTransactions((currentTransactions) => [
        {
          amount: Number(response.data.amount),
          category: response.data.category || response.data.categories?.name || transaction.category || 'General',
          date: response.data.transaction_date,
          id: response.data.id,
          name: response.data.name,
          tags: response.data.tags || transaction.tags || [],
        },
        ...currentTransactions,
      ]);
      return;
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleAddDebitOrder(debitOrder) {
    if (!session?.user?.id) {
      return;
    }

    if (!isDebitOrderStorageReady) {
      setDebitOrders((currentDebitOrders) => [
        {
          ...debitOrder,
          id: crypto.randomUUID(),
        },
        ...currentDebitOrders,
      ]);
      return;
    }

    const { data, error } = await supabase.from('debit_orders').insert({
      amount: debitOrder.amount,
      auto_add_monthly: debitOrder.autoAddMonthly,
      category: debitOrder.category,
      day_of_month: debitOrder.dayOfMonth,
      name: debitOrder.name,
      tags: debitOrder.tags || [],
      user_id: session.user.id,
    }).select('id, name, category, tags, amount, day_of_month, auto_add_monthly').single();

    if (error) {
      setIsDebitOrderStorageReady(false);
      setDebitOrders((currentDebitOrders) => [
        {
          ...debitOrder,
          id: crypto.randomUUID(),
        },
        ...currentDebitOrders,
      ]);
      return;
    }

    setTrackingError('');
    setDebitOrders((currentDebitOrders) => [
      {
        amount: Number(data.amount),
        autoAddMonthly: data.auto_add_monthly,
        category: data.category,
        dayOfMonth: data.day_of_month,
        id: data.id,
        name: data.name,
        tags: data.tags || [],
      },
      ...currentDebitOrders,
    ]);
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
          <button
            type="button"
            className={activeView === 'debit-orders' ? 'active' : ''}
            onClick={() => handleNavChange('debit-orders')}
          >
            Debit orders
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
        {activeView === 'debit-orders' && (
          <DebitOrders
            debitOrders={debitOrders}
            isStorageReady={isDebitOrderStorageReady}
            onSave={handleAddDebitOrder}
          />
        )}
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
