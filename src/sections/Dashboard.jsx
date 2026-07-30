import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const monthlyBudget = 18500;
const CHART_COLORS = ['#0f6b58', '#e7b45f', '#365f91', '#9b3d27', '#8b5cf6', '#d97706', '#16a34a', '#64748b'];

function formatCurrency(value, compact = false) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? 'compact' : 'standard',
    style: 'currency',
  }).format(value);
}

function asLocalDate(value) {
  return new Date(`${value}T12:00:00`);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(monthsAgo = 0) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - monthsAgo, 1);
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <strong>Nothing here yet</strong>
      <p>{message}</p>
    </div>
  );
}

export default function Dashboard({ isLoading, transactions }) {
  const [range, setRange] = useState('3months');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const rangeTransactions = useMemo(() => {
    if (range === 'all') return transactions;
    const cutoff = range === 'month' ? startOfMonth() : startOfMonth(2);
    return transactions.filter((transaction) => asLocalDate(transaction.date) >= cutoff);
  }, [range, transactions]);

  const currentMonthTransactions = useMemo(
    () => transactions.filter((transaction) => monthKey(asLocalDate(transaction.date)) === monthKey(new Date())),
    [transactions],
  );
  const currentSpent = currentMonthTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const remaining = monthlyBudget - currentSpent;
  const spentPercent = Math.min(Math.round((currentSpent / monthlyBudget) * 100), 100);

  const categoryData = useMemo(() => {
    const grouped = rangeTransactions.reduce((totals, transaction) => {
      const name = transaction.category || 'General';
      totals[name] = (totals[name] || 0) + Number(transaction.amount);
      return totals;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rangeTransactions]);

  const totalInRange = categoryData.reduce((sum, item) => sum + item.value, 0);
  const visibleTransactions = selectedCategory
    ? rangeTransactions.filter((transaction) => (transaction.category || 'General') === selectedCategory)
    : rangeTransactions;

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, reverseIndex) => {
      const date = startOfMonth(5 - reverseIndex);
      const key = monthKey(date);
      return {
        key,
        month: new Intl.DateTimeFormat('en-ZA', { month: 'short' }).format(date),
        spend: transactions
          .filter((transaction) => monthKey(asLocalDate(transaction.date)) === key)
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      };
    });
  }, [transactions]);

  const weeklySpend = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => ({
      name: `W${index + 1}`,
      spend: currentMonthTransactions
        .filter((transaction) => Math.min(Math.floor((asLocalDate(transaction.date).getDate() - 1) / 7), 4) === index)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }));
  }, [currentMonthTransactions]);

  return (
    <div className="dashboard-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your money story</h2>
        </div>
        <span className="status-pill">{spentPercent}% used this month</span>
      </header>

      <section className="metric-grid" aria-label="Budget summary">
        <article className="metric-tile"><span>Monthly budget</span><strong>{formatCurrency(monthlyBudget)}</strong></article>
        <article className="metric-tile"><span>Spent this month</span><strong>{formatCurrency(currentSpent)}</strong></article>
        <article className="metric-tile"><span>Still available</span><strong className={remaining < 0 ? 'negative-value' : ''}>{formatCurrency(remaining)}</strong></article>
      </section>

      <div className="chart-toolbar" aria-label="Chart period">
        <span>Explore spending:</span>
        {[
          ['month', 'This month'],
          ['3months', 'Last 3 months'],
          ['all', 'All time'],
        ].map(([value, label]) => (
          <button key={value} type="button" className={range === value ? 'active' : ''} onClick={() => { setRange(value); setSelectedCategory(null); }}>
            {label}
          </button>
        ))}
      </div>

      <section className="analytics-grid dashboard-charts">
        <article className="chart-panel">
          <div className="panel-title">
            <div><h3>Where it went</h3><span>Click a slice to filter details</span></div>
            <strong>{formatCurrency(totalInRange)}</strong>
          </div>
          {categoryData.length ? (
            <>
              <div className="rechart-wrap donut-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      innerRadius="52%"
                      outerRadius="82%"
                      paddingAngle={2}
                      onClick={(entry) => setSelectedCategory((current) => current === entry.name ? null : entry.name)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          opacity={!selectedCategory || selectedCategory === entry.name ? 1 : 0.3}
                          cursor="pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="category-legend">
                {categoryData.map((item, index) => (
                  <button key={item.name} type="button" className={selectedCategory === item.name ? 'active' : ''} onClick={() => setSelectedCategory((current) => current === item.name ? null : item.name)}>
                    <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span>{item.name}</span>
                    <strong>{Math.round((item.value / totalInRange) * 100)}%</strong>
                  </button>
                ))}
              </div>
            </>
          ) : <EmptyState message={isLoading ? 'Loading your tracking…' : 'Import a statement or add your first expense.'} />}
        </article>

        <article className="chart-panel">
          <div className="panel-title"><div><h3>Six-month trend</h3><span>See whether spending is rising or falling</span></div></div>
          <div className="rechart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ left: 4, right: 12, top: 10 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f6b58" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0f6b58" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8cfbf" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, true)} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Spend']} />
                <Area type="monotone" dataKey="spend" stroke="#0f6b58" strokeWidth={3} fill="url(#spendGradient)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="chart-panel">
        <div className="panel-title"><div><h3>This month by week</h3><span>Hover each bar for the exact amount</span></div></div>
        <div className="rechart-wrap short-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklySpend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8cfbf" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(value, true)} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Spend']} cursor={{ fill: 'rgba(15,107,88,.08)' }} />
              <Bar dataKey="spend" fill="#e7b45f" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="table-panel">
        <div className="panel-title">
          <div><h3>{selectedCategory ? `${selectedCategory} details` : 'Recent expenses'}</h3><span>{visibleTransactions.length} entries in this view</span></div>
          {selectedCategory && <button className="text-action" type="button" onClick={() => setSelectedCategory(null)}>Clear filter</button>}
        </div>
        <div className="transaction-list">
          {visibleTransactions.length ? visibleTransactions.slice(0, 20).map((transaction) => (
            <div className="transaction-row" key={transaction.id}>
              <div><strong>{transaction.name}</strong><span>{transaction.category} · {transaction.date}{transaction.source === 'bank-import' ? ' · Bank import' : ''}</span></div>
              <p>{formatCurrency(Number(transaction.amount))}</p>
            </div>
          )) : <EmptyState message="No expenses match this view." />}
        </div>
      </section>
    </div>
  );
}
