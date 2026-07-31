import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../lib/statementImport.js';

export default function TransactionEditor({ transaction, onClose, onDelete, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [transactionDate, setTransactionDate] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setName(transaction.name);
    setAmount(String(transaction.amount));
    setCategory(transaction.category || 'General');
    setTransactionDate(transaction.date);
    setMessage('');
  }, [transaction]);

  if (!transaction) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');
    try {
      await onSave({
        id: transaction.id,
        amount: Number(amount),
        category,
        name: name.trim(),
        tags: transaction.tags || [],
        transactionDate,
      });
      onClose();
    } catch (error) {
      setMessage(error?.message || 'Could not update this expense.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${transaction.name}”? This cannot be undone.`)) return;
    setIsBusy(true);
    setMessage('');
    try {
      await onDelete(transaction.id);
      onClose();
    } catch (error) {
      setMessage(error?.message || 'Could not delete this expense.');
      setIsBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="management-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Expense details</p>
            <h3>Edit transaction</h3>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close transaction editor">
            <X size={20} />
          </button>
        </div>

        <div className="management-form">
          <label htmlFor="edit-transaction-name">Name</label>
          <input id="edit-transaction-name" value={name} onChange={(event) => setName(event.target.value)} required />

          <div className="form-grid-two">
            <div>
              <label htmlFor="edit-transaction-amount">Amount</label>
              <input id="edit-transaction-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="edit-transaction-date">Date</label>
              <input id="edit-transaction-date" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
            </div>
          </div>

          <label htmlFor="edit-transaction-category">Category</label>
          <select id="edit-transaction-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {BUDGET_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>

          {message && <p className="form-message" role="alert">{message}</p>}

          <div className="management-actions">
            <button className="danger-action" type="button" onClick={handleDelete} disabled={isBusy}>
              <Trash2 size={17} /> Delete
            </button>
            <button className="primary-action" type="submit" disabled={isBusy || !name.trim()}>
              {isBusy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
