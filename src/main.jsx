import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexAuthProvider, useAuthActions } from '@convex-dev/auth/react';
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Menu, X } from 'lucide-react';
import { api } from '../convex/_generated/api';
import DebitOrders from './sections/DebitOrders.jsx';
import Dashboard from './sections/Dashboard.jsx';
import Login from './sections/Login.jsx';
import MonthCalendar from './sections/MonthCalendar.jsx';
import Products from './sections/Products.jsx';
import PwaUpdatePrompt from './sections/PwaUpdatePrompt.jsx';
import QuickAdd from './sections/QuickAdd.jsx';
import Register from './sections/Register.jsx';
import Settings from './sections/Settings.jsx';
import StatementImport from './sections/StatementImport.jsx';
import './style.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1024px)').matches);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !window.matchMedia('(max-width: 1024px)').matches);
  const [authView, setAuthView] = useState('login');
  const [theme, setTheme] = useState(() => localStorage.getItem('budgetr-theme') || 'light');
  const [trackingError, setTrackingError] = useState('');
  const transactionResult = useQuery(api.budget.listTransactions, isAuthenticated ? {} : 'skip');
  const debitOrderResult = useQuery(api.budget.listDebitOrders, isAuthenticated ? {} : 'skip');
  const currentMonthStart = `${formatLocalDate(new Date()).slice(0, 7)}-01`;
  const budgetMonth = useQuery(api.budget.getBudgetMonth, isAuthenticated ? { monthStart: currentMonthStart } : 'skip');
  const transactions = transactionResult ?? [];
  const debitOrders = debitOrderResult ?? [];
  const ensureDefaults = useMutation(api.budget.ensureDefaults);
  const addTransaction = useMutation(api.budget.addTransaction);
  const addDebitOrder = useMutation(api.budget.addDebitOrder);
  const updateDebitOrder = useMutation(api.budget.updateDebitOrder);
  const deleteDebitOrder = useMutation(api.budget.deleteDebitOrder);
  const updateTransaction = useMutation(api.budget.updateTransaction);
  const deleteTransaction = useMutation(api.budget.deleteTransaction);
  const setMonthlyBudget = useMutation(api.budget.setMonthlyBudget);
  const importTransactions = useMutation(api.budget.importTransactions);
  const syncMonthlyDebitOrders = useMutation(api.budget.syncMonthlyDebitOrders);
  const isLoadingTransactions = isAuthenticated && transactionResult === undefined;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('budgetr-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');

    function handleMediaChange(event) {
      setIsMobile(event.matches);
      setIsSidebarOpen(!event.matches);
    }

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const today = new Date();
    const transactionDate = formatLocalDate(today);
    const monthStart = `${transactionDate.slice(0, 7)}-01`;

    Promise.all([
      ensureDefaults({ monthStart }),
      syncMonthlyDebitOrders({
        currentMonth: transactionDate.slice(0, 7),
        transactionDate,
      }),
    ]).catch((error) => {
      setTrackingError(error.message);
    });
  }, [ensureDefaults, isAuthenticated, syncMonthlyDebitOrders]);

  async function handleAddTransaction(transaction) {
    if (isAuthenticated) {
      try {
        await addTransaction({
          amount: transaction.amount,
          category: transaction.category || 'General',
          name: transaction.name,
          tags: transaction.tags || [],
          transactionDate: transaction.transactionDate || formatLocalDate(new Date()),
        });
        setTrackingError('');
      } catch (error) {
        setTrackingError(error.message);
        throw error;
      }
    }
  }

  async function handleSignOut() {
    setActiveView('dashboard');
    setAuthView('login');
    await signOut();
  }

  async function handleAddDebitOrder(debitOrder) {
    if (!isAuthenticated) {
      return;
    }

    try {
      await addDebitOrder({
        amount: debitOrder.amount,
        autoAddMonthly: debitOrder.autoAddMonthly,
        category: debitOrder.category,
        dayOfMonth: debitOrder.dayOfMonth,
        name: debitOrder.name,
        tags: debitOrder.tags || [],
      });
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleUpdateTransaction(transaction) {
    try {
      await updateTransaction(transaction);
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleDeleteTransaction(id) {
    try {
      await deleteTransaction({ id });
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleUpdateDebitOrder(debitOrder) {
    try {
      await updateDebitOrder({
        id: debitOrder.id,
        active: debitOrder.active,
        amount: Number(debitOrder.amount),
        autoAddMonthly: debitOrder.autoAddMonthly,
        category: debitOrder.category,
        dayOfMonth: Number(debitOrder.dayOfMonth),
        name: debitOrder.name,
        tags: debitOrder.tags || [],
      });
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleDeleteDebitOrder(id) {
    try {
      await deleteDebitOrder({ id });
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleBudgetSave(amount) {
    try {
      await setMonthlyBudget({ amount, monthStart: currentMonthStart });
      setTrackingError('');
    } catch (error) {
      setTrackingError(error.message);
      throw error;
    }
  }

  async function handleImportTransactions(importRows) {
    const result = { imported: 0, skipped: 0 };

    for (let index = 0; index < importRows.length; index += 200) {
      const batchResult = await importTransactions({
        transactions: importRows.slice(index, index + 200),
      });
      result.imported += batchResult.imported;
      result.skipped += batchResult.skipped;
    }

    setTrackingError('');
    return result;
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme);
  }

  function handleNavChange(view) {
    setActiveView(view);

    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }

  if (isLoading) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <p className="form-message">Loading BudgetR…</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
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
        <div className="sidebar-brand">
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
          <button
            type="button"
            className={activeView === 'import' ? 'active' : ''}
            onClick={() => handleNavChange('import')}
          >
            Import statements
          </button>
          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            onClick={() => handleNavChange('settings')}
          >
            Settings
          </button>
        </nav>
        <button className="sign-out-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </aside>

      <section className="workspace">
        {trackingError && <p className="form-message">{trackingError}</p>}
        {activeView === 'dashboard' && (
          <Dashboard
            isLoading={isLoadingTransactions}
            monthlyBudget={budgetMonth?.amount ?? 0}
            onBudgetSave={handleBudgetSave}
            onTransactionDelete={handleDeleteTransaction}
            onTransactionUpdate={handleUpdateTransaction}
            transactions={transactions}
          />
        )}
        {activeView === 'months' && <MonthCalendar transactions={transactions} />}
        {activeView === 'products' && (
          <Products
            onTransactionDelete={handleDeleteTransaction}
            onTransactionUpdate={handleUpdateTransaction}
            transactions={transactions}
          />
        )}
        {activeView === 'debit-orders' && (
          <DebitOrders
            debitOrders={debitOrders}
            onDelete={handleDeleteDebitOrder}
            onSave={handleAddDebitOrder}
            onUpdate={handleUpdateDebitOrder}
          />
        )}
        {activeView === 'import' && <StatementImport onImport={handleImportTransactions} />}
        {activeView === 'settings' && (
          <Settings theme={theme} onThemeChange={handleThemeChange} />
        )}
      </section>

      <QuickAdd onSave={handleAddTransaction} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
      <PwaUpdatePrompt />
    </ConvexAuthProvider>
  </StrictMode>,
);
