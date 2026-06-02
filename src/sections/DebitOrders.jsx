import { useMemo, useState } from 'react';
import { CalendarClock, Repeat } from 'lucide-react';
import { findProduct, productCatalog } from '../lib/productCatalog';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function groupByCategory(debitOrders) {
  return debitOrders.reduce((groups, debitOrder) => {
    const category = debitOrder.category || 'General';
    groups[category] = groups[category] || [];
    groups[category].push(debitOrder);
    return groups;
  }, {});
}

export default function DebitOrders({ debitOrders, isStorageReady, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [autoAddMonthly, setAutoAddMonthly] = useState(true);
  const selectedProduct = name ? findProduct(name) : null;
  const groupedDebitOrders = useMemo(() => groupByCategory(debitOrders), [debitOrders]);
  const filteredProducts = productCatalog.filter((product) =>
    product.name.toLowerCase().includes(name.toLowerCase()),
  );

  function handleSubmit(event) {
    event.preventDefault();

    if (!name || !amount || !dayOfMonth) {
      return;
    }

    onSave({
      amount: Number(amount),
      autoAddMonthly,
      category: selectedProduct?.category || 'General',
      dayOfMonth: Number(dayOfMonth),
      name,
      tags: selectedProduct?.tags || ['monthly'],
    });
    setName('');
    setAmount('');
    setDayOfMonth('1');
    setAutoAddMonthly(true);
  }

  return (
    <div className="debit-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Debit orders</p>
          <h2>Monthly commitments</h2>
        </div>
        <span className="status-pill">{debitOrders.length} active</span>
      </header>

      <section className="debit-grid">
        <form className="debit-form table-panel" onSubmit={handleSubmit}>
          <div className="panel-title">
            <h3>Add debit order</h3>
            <Repeat size={20} />
          </div>

          <label htmlFor="debit-name">Product</label>
          <input
            id="debit-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search or type, e.g. Insurance"
          />

          {name && filteredProducts.length > 0 && (
            <div className="suggestion-row">
              {filteredProducts.slice(0, 8).map((product) => (
                <button key={product.name} type="button" onClick={() => setName(product.name)}>
                  {product.name}
                </button>
              ))}
            </div>
          )}

          <label htmlFor="debit-amount">Amount</label>
          <input
            id="debit-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />

          <label htmlFor="debit-day">Debit day</label>
          <input
            id="debit-day"
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={autoAddMonthly}
              onChange={(event) => setAutoAddMonthly(event.target.checked)}
            />
            <span>Auto add this debit order each month</span>
          </label>

          <button className="primary-action" type="submit">
            Save debit order
          </button>
        </form>

        <section className="table-panel">
          <div className="panel-title">
            <h3>By category</h3>
            <CalendarClock size={20} />
          </div>

          <div className="debit-category-list">
            {!isStorageReady && (
              <div className="empty-state">
                <strong>Debit order storage is not ready yet</strong>
                <p>
                  You can draft debit orders in this session, but run the latest Supabase schema
                  before they persist after refresh.
                </p>
              </div>
            )}

            {Object.entries(groupedDebitOrders).length ? (
              Object.entries(groupedDebitOrders).map(([category, items]) => (
                <article className="debit-category" key={category}>
                  <div className="category-row">
                    <div>
                      <strong>{category}</strong>
                      <span>{items.length} debit orders</span>
                    </div>
                    <p>{formatCurrency(items.reduce((total, item) => total + Number(item.amount), 0))}</p>
                  </div>
                  {items.map((item) => (
                    <div className="debit-order-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>Day {item.dayOfMonth}</span>
                      </div>
                      <div>
                        <p>{formatCurrency(item.amount)}</p>
                        {item.autoAddMonthly && <small>Auto monthly</small>}
                      </div>
                    </div>
                  ))}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>No debit orders yet</strong>
                <p>Add recurring commitments like insurance, rent, subscriptions, or savings.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
