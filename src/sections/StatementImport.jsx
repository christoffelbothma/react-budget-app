import { useMemo, useState } from 'react';
import { useAction } from 'convex/react';
import { CheckCircle2, FileSpreadsheet, Sparkles, Upload } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { BUDGET_CATEGORIES, parseCsvStatement } from '../lib/statementImport.js';

const MAX_COMPATIBILITY_PDF_BYTES = 3 * 1024 * 1024;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    currency: 'ZAR',
    style: 'currency',
  }).format(value);
}

function getStatementPeriod(rows) {
  const dates = rows
    .map((row) => Date.parse(`${row.transactionDate}T00:00:00Z`))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!dates.length) return { days: 0, months: 0 };

  const days = Math.round((dates[dates.length - 1] - dates[0]) / 86400000);
  return {
    days,
    months: Math.max(1, Math.ceil(days / 31)),
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return btoa(binary);
}

async function parseFile(file, extractPdfText) {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error(`${file.name}: choose a file smaller than 15 MB.`);
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const {
      parseExtractedPdfPages,
      parsePdfStatement,
      readFileAsArrayBuffer,
    } = await import('../lib/pdfStatementImport.js');
    const forceCompatibilityMode = import.meta.env.DEV
      && new URLSearchParams(window.location.search).has('force-pdf-compatibility');

    if (!forceCompatibilityMode) {
      try {
        return await parsePdfStatement(file);
      } catch (error) {
        if (error?.code !== 'PDF_DEVICE_READ_FAILED') throw error;
      }
    }

    if (file.size > MAX_COMPATIBILITY_PDF_BYTES) {
      throw new Error(
        `${file.name}: Safari could not read this PDF and it is too large for compatibility mode. Use a CSV export or a PDF smaller than 3 MB.`,
      );
    }

    try {
      const buffer = await readFileAsArrayBuffer(file);
      const result = await extractPdfText({ dataBase64: arrayBufferToBase64(buffer) });
      return parseExtractedPdfPages(result.pages, file.name);
    } catch {
      throw new Error(
        `${file.name}: BudgetR could not read this PDF, even in iPhone compatibility mode. Try a CSV export.`,
      );
    }
  }

  return parseCsvStatement(await file.text(), file.name);
}

function friendlyImportError(error) {
  const message = String(error?.message || '');
  if (/undefined is not a function|not iterable|withResolvers/i.test(message)) {
    return 'The PDF reader needs the latest BudgetR update. Install the available update, reopen the app, and try again.';
  }
  return message || 'BudgetR could not read that statement. Try a CSV export or a different PDF.';
}

export default function StatementImport({ onImport }) {
  const extractPdfText = useAction(api.pdf.extractPdfText);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const includedRows = rows.filter((row) => row.included);
  const total = includedRows.reduce((sum, row) => sum + row.amount, 0);
  const statementPeriod = useMemo(() => getStatementPeriod(rows), [rows]);

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
      const parsedRows = (await Promise.all(files.map((file) => parseFile(file, extractPdfText)))).flat();
      const detectedPeriod = getStatementPeriod(parsedRows);
      if (detectedPeriod.days > 93) {
        setRows([]);
        setMessage('These statements span more than three months. Please choose a three-month period.');
        return;
      }
      setRows(parsedRows);
      setMessage(parsedRows.length ? `${parsedRows.length} expenses found and auto-categorised.` : 'No expense rows were found in the selected statements.');
    } catch (error) {
      setRows([]);
      setMessage(friendlyImportError(error));
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
      setMessage(error?.message || 'BudgetR could not import those expenses. Please try again.');
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
          <small>PDFs are read on your device first. If iPhone Safari cannot read one, BudgetR processes it once without saving the file to your account.</small>
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
            <div><span>Months</span><strong>{statementPeriod.months}</strong></div>
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
