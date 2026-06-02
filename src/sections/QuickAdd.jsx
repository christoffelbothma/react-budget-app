import { useState } from 'react';
import { findProduct, productCatalog } from '../lib/productCatalog';

const allTags = [...new Set(productCatalog.flatMap((product) => product.tags))].sort();

export default function QuickAdd({ onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  const filteredProducts = productCatalog.filter((product) =>
    product.name.toLowerCase().includes(name.toLowerCase()),
  );
  const selectedProduct = name ? findProduct(name) : null;
  const visibleTags = selectedProduct ? selectedProduct.tags : allTags.slice(0, 10);

  function handleSubmit(event) {
    event.preventDefault();

    if (!name || !amount) {
      return;
    }

    onSave({
      amount: Number(amount),
      category: selectedProduct?.category || 'General',
      name,
      tags: selectedTags,
    });
    setName('');
    setAmount('');
    setSelectedTags([]);
    setIsOpen(false);
  }

  function handleProductSelect(product) {
    setName(product.name);
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
              x
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

          <button className="primary-action" type="submit">
            Save
          </button>
        </form>
      )}

      <button className="floating-action" type="button" onClick={() => setIsOpen(true)}>
        +
      </button>
    </div>
  );
}
