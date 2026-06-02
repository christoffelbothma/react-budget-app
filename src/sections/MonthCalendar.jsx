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
              className={`month-card ${index === currentMonth ? 'selected' : ''}`}
              key={month}
              type="button"
            >
              <span>{month.slice(0, 3)}</span>
              <strong>{month}</strong>
              <small>{monthSpend ? formatCurrency(monthSpend) : 'No tracking yet'}</small>
            </button>
          );
        })}
      </section>
    </div>
  );
}
