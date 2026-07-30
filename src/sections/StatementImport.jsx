import { useMemo, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Sparkles, Upload } from 'lucide-react';
import { BUDGET_CATEGORIES, parseCsvStatement } from '../lib/statementImport.js';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    style: 'currency',
  }).format(value);
}

async function parseFile(file) {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error(`${file.name}: choose a file smaller than 15 MB.`);
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const { parsePdfStatement } = await import('../lib/pdfStatementImport.js');
    return await parsePdfStatement(file);
  }

  return parseCsvStatement(await file.text(), file.name);
}

export default function StatementImport({ onImport }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const includedRows = rows.filter((row) => row.included);
  const total = includedRows.reduce((sum, row) => sum + row.amount, 0);
  const monthCount = useMemo(
    () => new Set(rows.map((row) => row.transactionDate.slice(0, 7))).size,
    [rows],
  );

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    setMessage('');

    if (!files.length) return;
    if (files.length > 3) {
      setMessage('Choose a maximum of three CSV files.');
      return;
    }

    setIsBusy(true);
    try {
      const parsedRows = (await Promise.all(files.map(parseFile))).flat();
      const detectedMonths = new Set(parsedRows.map((row) => row.transactionDate.slice(0, 7)));
      if (detectedMonths.size > 3) {
        setRows([]);
        setMessage('These statements span more than three months. Please choose a three-month period.');
        return;
      }
      setRows(parsedRows);
      setMessage(parsedRows.length ? `${parsedRows.length} expenses found and auto-categorised.` : 'No expense rows were found in the selected statements.');
    } catch (error) {
      setRows([]);
      setMessage(error.message);
    } finally {
      setIsBusy(false);
      event.target.value = '';
    }
  }

  function updateRow(externalId, patch) {
    setRows((current) => current.map((row) => (row.externalId === externalId ? { ...row, ...patch } : row)));
  }

  async function handleImport() {
    setIsBusy(true);
    try {
      const result = await onImport(includedRows.map(({ included, ...row }) => row));
      setRows([]);
      setMessage(`${result.imported} expenses imported${result.skipped ? `; ${result.skipped} duplicates skipped` : ''}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="import-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">Smart capture</p>
          <h2>Import bank statements</h2>
        </div>
        <span className="status-pill"><Sparkles size={16} /> Auto-categorise</span>
      </header>

      <section className="import-dropzone">
        <FileSpreadsheet size={38} aria-hidden="true" />
        <div>
          <h3>Bring in up to three months</h3>
          <p>Choose one to three bank-export CSV or text-based PDF files. Credits are ignored; expenses are reviewed before saving.</p>
        </div>
        <label className="primary-action import-picker">
          <Upload size={18} /> {isBusy ? 'Reading…' : 'Choose statements'}
          <input type="file" accept=".csv,.pdf,text/csv,application/pdf" multiple disabled={isBusy} onChange={handleFiles} />
        </label>
      </section>

      {message && <p className="import-message">{message}</p>}

      {rows.length > 0 && (
        <>
          <section className="import-summary" aria-label="Import summary">
            <div><span>Detected</span><strong>{rows.length} expenses</strong></div>
            <div><span>Months</span><strong>{monthCount}</strong></div>
            <div><span>Selected total</span><strong>{formatCurrency(total)}</strong></div>
          </section>

          <section className="table-panel import-review">
            <div className="panel-title">
              <div>
                <h3>Review categories</h3>
                <span>Untick anything you do not want to import</span>
              </div>
              <button className="primary-action import-confirm" type="button" disabled={isBusy || !includedRows.length} onClick={handleImport}>
                <CheckCircle2 size={18} /> Import {includedRows.length}
              </button>
            </div>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead><tr><th>Use</th><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.externalId} className={row.included ? '' : 'excluded'}>
                      <td><input type="checkbox" checked={row.included} aria-label={`Include ${row.name}`} onChange={(event) => updateRow(row.externalId, { included: event.target.checked })} /></td>
                      <td>{row.transactionDate}</td>
                      <td><strong>{row.name}</strong><small>{row.sourceFile}</small></td>
                      <td>
                        <select value={row.category} onChange={(event) => updateRow(row.externalId, { category: event.target.value })}>
                          {BUDGET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
