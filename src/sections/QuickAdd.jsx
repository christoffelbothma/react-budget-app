import { useState } from 'react';

const suggestions = ['Rent', 'Groceries', 'Fuel', 'Internet', 'Electricity', 'Coffee'];

export default function QuickAdd({ onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(name.toLowerCase()),
  );

  function handleSubmit(event) {
    event.preventDefault();

    if (!name || !amount) {
      return;
    }

    onSave({
      amount: Number(amount),
      name,
    });
    setName('');
    setAmount('');
    setIsOpen(false);
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

          {name && filteredSuggestions.length > 0 && (
            <div className="suggestion-row">
              {filteredSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setName(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

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
