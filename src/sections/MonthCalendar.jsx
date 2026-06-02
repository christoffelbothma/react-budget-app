import { useMemo, useState } from 'react';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export default function MonthCalendar({ transactions }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const selectedTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === selectedMonth && transactionDate.getFullYear() === currentYear;
      }),
    [currentYear, selectedMonth, transactions],
  );
  const selectedSummary = useMemo(() => {
    const grouped = selectedTransactions.reduce((items, transaction) => {
      if (!items[transaction.name]) {
        items[transaction.name] = {
          category: transaction.category || 'General',
          name: transaction.name,
          total: 0,
        };
      }

      items[transaction.name].total += Number(transaction.amount);
      return items;
    }, {});

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [selectedTransactions]);

  return (
    <div className="month-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Year calendar</p>
          <h2>Select a month</h2>
        </div>
        <span className="status-pill">{currentYear}</span>
      </header>

      <section className="month-grid" aria-label="Months in 2026">
        {months.map((month, index) => {
          const monthSpend = transactions
            .filter((transaction) => {
              const transactionDate = new Date(transaction.date);
              return transactionDate.getMonth() === index && transactionDate.getFullYear() === currentYear;
            })
            .reduce((total, transaction) => total + Number(transaction.amount), 0);

          return (
            <button
              className={`month-card ${index === selectedMonth ? 'selected' : ''}`}
              key={month}
              onClick={() => setSelectedMonth(index)}
              type="button"
            >
              <span>{month.slice(0, 3)}</span>
              <strong>{month}</strong>
              <small>{monthSpend ? formatCurrency(monthSpend) : 'No tracking yet'}</small>
            </button>
          );
        })}
      </section>

      <section className="table-panel">
        <div className="panel-title">
          <h3>{months[selectedMonth]} summary</h3>
          <span>{selectedTransactions.length} entries</span>
        </div>
        <div className="transaction-list">
          {selectedSummary.length ? (
            selectedSummary.map((item) => (
              <div className="transaction-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </div>
                <p>{formatCurrency(item.total)}</p>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <strong>No spend captured</strong>
              <p>This month will show a sorted summary once you add items.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
