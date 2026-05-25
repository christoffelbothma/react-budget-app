import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">React Budget App</p>
        <h1>Budgeting starts here.</h1>
        <p>
          This starter app is ready for the next round of budgeting features.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
