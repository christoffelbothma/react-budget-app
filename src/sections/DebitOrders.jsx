import { useMemo, useState } from 'react';
import { CalendarClock, Pause, Pencil, Play, Repeat, Trash2 } from 'lucide-react';
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

export default function DebitOrders({ debitOrders, onDelete, onSave, onUpdate }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [autoAddMonthly, setAutoAddMonthly] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');
  const selectedProduct = name ? findProduct(name) : null;
  const groupedDebitOrders = useMemo(() => groupByCategory(debitOrders), [debitOrders]);
  const filteredProducts = productCatalog.filter((product) =>
    product.name.toLowerCase().includes(name.toLowerCase()),
  );

  function resetForm() {
    setEditingId(null);
    setName('');
    setAmount('');
    setDayOfMonth('1');
    setAutoAddMonthly(true);
    setMessage('');
  }

  function editDebitOrder(debitOrder) {
    setEditingId(debitOrder.id);
    setName(debitOrder.name);
    setAmount(String(debitOrder.amount));
    setDayOfMonth(String(debitOrder.dayOfMonth));
    setAutoAddMonthly(debitOrder.autoAddMonthly);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name || !amount || !dayOfMonth) {
      return;
    }

    setIsBusy(true);
    setMessage('');
    const current = debitOrders.find((item) => item.id === editingId);
    const payload = {
      active: current?.active ?? true,
      amount: Number(amount),
      autoAddMonthly,
      category: selectedProduct?.category || current?.category || 'General',
      dayOfMonth: Number(dayOfMonth),
      name: name.trim(),
      tags: selectedProduct?.tags || current?.tags || ['monthly'],
    };
    try {
      if (editingId) await onUpdate({ id: editingId, ...payload });
      else await onSave(payload);
      resetForm();
    } catch (error) {
      setMessage(error?.message || 'Could not save this debit order.');
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleActive(item) {
    try {
      await onUpdate({ ...item, active: !item.active });
    } catch (error) {
      setMessage(error?.message || 'Could not update this debit order.');
    }
  }

  async function deleteDebitOrder(item) {
    if (!window.confirm(`Delete “${item.name}”? Existing expenses will remain.`)) return;
    try {
      await onDelete(item.id);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setMessage(error?.message || 'Could not delete this debit order.');
    }
  }

  return (
    <div className="debit-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Debit orders</p>
          <h2>Monthly commitments</h2>
        </div>
        <span className="status-pill">{debitOrders.filter((item) => item.active).length} active</span>
      </header>

      <section className="debit-grid">
        <form className="debit-form table-panel" onSubmit={handleSubmit}>
          <div className="panel-title">
            <h3>{editingId ? 'Edit debit order' : 'Add debit order'}</h3>
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

          {message && <p className="form-message" role="alert">{message}</p>}

          <div className="form-actions">
            {editingId && <button className="secondary-action" type="button" onClick={resetForm}>Cancel</button>}
            <button className="primary-action" type="submit" disabled={isBusy}>
              {isBusy ? 'Saving…' : editingId ? 'Save changes' : 'Save debit order'}
            </button>
          </div>
        </form>

        <section className="table-panel">
          <div className="panel-title">
            <h3>By category</h3>
            <CalendarClock size={20} />
          </div>

          <div className="debit-category-list">
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
                    <div className={`debit-order-row ${item.active ? '' : 'paused'}`} key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>Day {item.dayOfMonth}{item.active ? '' : ' · Paused'}</span>
                      </div>
                      <div className="debit-order-details">
                        <p>{formatCurrency(item.amount)}</p>
                        {item.autoAddMonthly && <small>Auto monthly</small>}
                        <div className="row-actions">
                          <button type="button" onClick={() => editDebitOrder(item)}><Pencil size={15} /> Edit</button>
                          <button type="button" onClick={() => toggleActive(item)}>{item.active ? <Pause size={15} /> : <Play size={15} />} {item.active ? 'Pause' : 'Resume'}</button>
                          <button className="danger-text" type="button" onClick={() => deleteDebitOrder(item)}><Trash2 size={15} /> Delete</button>
                        </div>
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
