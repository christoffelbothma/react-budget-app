import { useMemo, useState } from 'react';
import { Coffee, Fuel, Home, ReceiptText, ShoppingBasket, Wifi, X } from 'lucide-react';

const productIcons = {
  Coffee,
  Fuel,
  Groceries: ShoppingBasket,
  Internet: Wifi,
  Rent: Home,
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function groupProducts(transactions) {
  const grouped = transactions.reduce((products, transaction) => {
    const name = transaction.name || 'Unlabelled';

    if (!products[name]) {
      products[name] = {
        category: transaction.category || 'General',
        entries: [],
        name,
        total: 0,
      };
    }

    products[name].entries.push(transaction);
    products[name].total += Number(transaction.amount);
    return products;
  }, {});

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

export default function Products({ transactions }) {
  const products = useMemo(() => groupProducts(transactions), [transactions]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const largestTotal = Math.max(...products.map((product) => product.total), 1);

  return (
    <div className="products-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Products</p>
          <h2>What you spend on</h2>
        </div>
        <span className="status-pill">{products.length} tracked</span>
      </header>

      <section className="product-grid" aria-label="Spending by product">
        {products.map((product) => {
          const Icon = productIcons[product.name] || ReceiptText;
          const width = Math.max((product.total / largestTotal) * 100, 8);

          return (
            <button
              className="product-card"
              key={product.name}
              type="button"
              onClick={() => setSelectedProduct(product)}
            >
              <span className="product-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={2.4} />
              </span>
              <div className="product-card-copy">
                <small>{product.category}</small>
                <strong>{product.name}</strong>
                <span>{product.entries.length} captured</span>
              </div>
              <p>{formatCurrency(product.total)}</p>
              <div className="product-meter" aria-hidden="true">
                <span style={{ width: `${width}%` }} />
              </div>
            </button>
          );
        })}
      </section>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="product-modal"
            aria-labelledby="product-modal-title"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <span className="product-icon large" aria-hidden="true">
                {(() => {
                  const Icon = productIcons[selectedProduct.name] || ReceiptText;
                  return <Icon size={30} strokeWidth={2.4} />;
                })()}
              </span>
              <div>
                <p className="eyebrow">{selectedProduct.category}</p>
                <h3 id="product-modal-title">{selectedProduct.name}</h3>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close product details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-total">
              <span>Total spent</span>
              <strong>{formatCurrency(selectedProduct.total)}</strong>
            </div>

            <div className="modal-entry-list">
              {selectedProduct.entries.map((entry) => (
                <div className="modal-entry" key={entry.id}>
                  <div>
                    <strong>{formatDate(entry.date)}</strong>
                    <span>{entry.category}</span>
                  </div>
                  <p>{formatCurrency(Number(entry.amount))}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
