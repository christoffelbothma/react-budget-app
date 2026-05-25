const monthlyBudget = 18500;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function sumTransactions(transactions) {
  return transactions.reduce((total, transaction) => total + Number(transaction.amount), 0);
}

function groupByCategory(transactions) {
  return transactions.reduce((groups, transaction) => {
    const category = transaction.category || 'General';
    groups[category] = (groups[category] || 0) + Number(transaction.amount);
    return groups;
  }, {});
}

export default function Dashboard({ transactions }) {
  const spent = sumTransactions(transactions);
  const remaining = monthlyBudget - spent;
  const spentPercent = Math.min(Math.round((spent / monthlyBudget) * 100), 100);
  const categoryTotals = Object.entries(groupByCategory(transactions)).sort((a, b) => b[1] - a[1]);
  const weeklySpend = [2800, 4300, 2100, 3600, Math.max(spent - 12800, 900)];
  const maxWeeklySpend = Math.max(...weeklySpend);

  return (
    <div className="dashboard-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your May spending</h2>
        </div>
        <span className="status-pill">{spentPercent}% used</span>
      </header>

      <section className="metric-grid" aria-label="Budget summary">
        <article className="metric-tile">
          <span>Monthly budget</span>
          <strong>{formatCurrency(monthlyBudget)}</strong>
        </article>
        <article className="metric-tile">
          <span>Spent</span>
          <strong>{formatCurrency(spent)}</strong>
        </article>
        <article className="metric-tile">
          <span>Remaining</span>
          <strong>{formatCurrency(remaining)}</strong>
        </article>
      </section>

      <section className="analytics-grid">
        <article className="chart-panel">
          <div className="panel-title">
            <h3>Weekly spend</h3>
          </div>
          <div className="bar-chart" aria-label="Weekly spending chart">
            {weeklySpend.map((value, index) => (
              <div className="bar-column" key={value + index}>
                <span style={{ height: `${Math.max((value / maxWeeklySpend) * 100, 14)}%` }} />
                <small>W{index + 1}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="chart-panel">
          <div className="panel-title">
            <h3>Categories</h3>
            <span>{transactions.length} entries</span>
          </div>
          <div className="category-list">
            {categoryTotals.map(([category, total]) => (
              <div className="category-row" key={category}>
                <div>
                  <strong>{category}</strong>
                  <span>{Math.round((total / spent) * 100)}% of spend</span>
                </div>
                <p>{formatCurrency(total)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="table-panel">
        <div className="panel-title">
          <h3>Recent tracking</h3>
          <span>Latest first</span>
        </div>
        <div className="transaction-list">
          {transactions.map((transaction) => (
            <div className="transaction-row" key={transaction.id}>
              <div>
                <strong>{transaction.name}</strong>
                <span>{transaction.category}</span>
              </div>
              <p>{formatCurrency(Number(transaction.amount))}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
