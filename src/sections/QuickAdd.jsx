import { useState } from 'react';
import { X } from 'lucide-react';
import { findProduct, productCatalog } from '../lib/productCatalog';
import { BUDGET_CATEGORIES } from '../lib/statementImport.js';

const allTags = [...new Set(productCatalog.flatMap((product) => product.tags))].sort();

function todayValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function QuickAdd({ onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [transactionDate, setTransactionDate] = useState(todayValue);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  const filteredProducts = productCatalog.filter((product) =>
    product.name.toLowerCase().includes(name.toLowerCase()),
  );
  const selectedProduct = name ? findProduct(name) : null;
  const visibleTags = selectedProduct ? selectedProduct.tags : allTags.slice(0, 10);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name || !amount) {
      return;
    }

    setIsBusy(true);
    setMessage('');
    try {
      await onSave({
        amount: Number(amount),
        category,
        name: name.trim(),
        tags: selectedTags,
        transactionDate,
      });
      setName('');
      setAmount('');
      setCategory('General');
      setTransactionDate(todayValue());
      setSelectedTags([]);
      setIsOpen(false);
    } catch (error) {
      setMessage(error?.message || 'Could not save this expense.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleProductSelect(product) {
    setName(product.name);
    setCategory(product.category);
    setSelectedTags(product.tags);
  }

  function handleTagToggle(tag) {
    setSelectedTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
    );
  }

  return (
    <div className="quick-add">
      {isOpen && (
        <form className="quick-add-panel" onSubmit={handleSubmit}>
          <div className="panel-title">
            <h3>Quick add</h3>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close quick add">
              <X size={18} />
            </button>
          </div>

          <label htmlFor="quick-name">Name</label>
          <input
            id="quick-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search or type, e.g. Rent"
            autoComplete="off"
          />

          {filteredProducts.length > 0 && (
            <div className="suggestion-row">
              {filteredProducts.slice(0, 8).map((product) => (
                <button key={product.name} type="button" onClick={() => handleProductSelect(product)}>
                  {product.name}
                </button>
              ))}
            </div>
          )}

          <label>Tags</label>
          <div className="tag-row">
            {visibleTags.map((tag) => (
              <button
                className={selectedTags.includes(tag) ? 'selected' : ''}
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="form-grid-two">
            <div>
              <label htmlFor="quick-category">Category</label>
              <select id="quick-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {BUDGET_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="quick-date">Date</label>
              <input id="quick-date" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
            </div>
          </div>

          <label htmlFor="quick-amount">Amount</label>
          <input
            id="quick-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />

          {message && <p className="form-message" role="alert">{message}</p>}

          <button className="primary-action" type="submit" disabled={isBusy}>
            {isBusy ? 'Saving…' : 'Save expense'}
          </button>
        </form>
      )}

      <button className="floating-action" type="button" onClick={() => setIsOpen(true)} aria-label="Add expense">
        <span aria-hidden="true">+</span><strong>Add expense</strong>
      </button>
    </div>
  );
}
