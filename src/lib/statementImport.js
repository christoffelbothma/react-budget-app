import Papa from 'papaparse';

export const BUDGET_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Lifestyle',
  'Financial',
  'Health',
  'Education',
  'Shopping',
  'Savings',
  'General',
];

const CATEGORY_RULES = [
  ['Housing', ['rent', 'bond', 'home loan', 'property levy', 'body corporate']],
  ['Food', ['checkers', 'pick n pay', 'pnp ', 'woolworths food', 'spar ', 'shoprite', 'uber eats', 'mr d', 'restaurant', 'cafe', 'coffee']],
  ['Transport', ['engen', 'sasol', 'shell', 'bp ', 'uber trip', 'bolt', 'gautrain', 'parking', 'toll']],
  ['Utilities', ['eskom', 'electricity', 'municipality', 'water', 'telkom', 'afrihost', 'vodacom', 'mtn ', 'cell c', 'rain ']],
  ['Lifestyle', ['netflix', 'spotify', 'showmax', 'virgin active', 'planet fitness', 'entertainment', 'cinema']],
  ['Financial', ['bank fee', 'service fee', 'monthly fee', 'insurance', 'discovery insure', 'outsurance', 'santam']],
  ['Health', ['clicks', 'dis-chem', 'dischem', 'pharmacy', 'mediclinic', 'doctor', 'dentist', 'medical aid']],
  ['Education', ['school', 'university', 'tuition', 'course', 'udemy']],
  ['Shopping', ['takealot', 'amazon', 'makro', 'game store', 'mr price', 'woolworths ']],
  ['Savings', ['savings', 'investment', 'easy equities', 'easyequities']],
];

const HEADER_ALIASES = {
  amount: ['amount', 'transactionamount', 'transactionvalue', 'value', 'amountzar'],
  credit: ['credit', 'credits', 'creditamount', 'deposit', 'deposits', 'depositamount', 'moneyin', 'paidin'],
  date: ['date', 'transactiondate', 'postingdate', 'valuedate', 'processeddate', 'effectivedate', 'bookdate'],
  debit: ['debit', 'debits', 'debitamount', 'payment', 'payments', 'withdrawal', 'withdrawals', 'withdrawalamount', 'moneyout', 'paidout'],
  description: [
    'description',
    'details',
    'transactiondetails',
    'narrative',
    'narration',
    'transactiondescription',
    'statementdescription',
    'reference',
    'memo',
    'beneficiary',
    'merchant',
    'recipient',
    'payee',
  ],
  type: ['type', 'transactiontype', 'creditdebit', 'debitcreditindicator', 'drcr', 'dc'],
};

function normaliseHeader(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findValue(row, aliases) {
  const key = Object.keys(row).find((candidate) => {
    const header = normaliseHeader(candidate);
    if (header.includes('balance')) return false;
    return aliases.includes(header);
  });
  return key ? row[key] : '';
}

export function parseStatementAmount(value) {
  let cleaned = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/(CR|DR|DB)$/i, '')
    .replace(/[R$]/gi, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[()]/g, (match) => (match === '(' ? '-' : ''));
  if (cleaned.endsWith('-')) cleaned = `-${cleaned.slice(0, -1)}`;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

export function parseStatementDate(value, fallbackYear) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  const localMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  const textualDate = /^(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})$/;
  const textualDateWithoutYear = /^(?:\d{1,2}\s+[A-Za-z]{3,9}|[A-Za-z]{3,9}\s+\d{1,2})$/;
  let date;

  if (isoMatch) {
    date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else if (compactMatch) {
    date = new Date(Number(compactMatch[1]), Number(compactMatch[2]) - 1, Number(compactMatch[3]));
  } else if (localMatch) {
    let year = Number(localMatch[3]);
    if (year < 100) year += 2000;
    date = new Date(year, Number(localMatch[2]) - 1, Number(localMatch[1]));
  } else if (textualDate.test(raw)) {
    date = new Date(raw);
  } else if (fallbackYear && textualDateWithoutYear.test(raw)) {
    date = new Date(`${raw} ${fallbackYear}`);
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hashStatementValue(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function categoriseTransaction(description) {
  const searchable = String(description).toLowerCase();
  return CATEGORY_RULES.find(([, terms]) => terms.some((term) => searchable.includes(term)))?.[0] || 'General';
}

export function normaliseStatementRows(rows, fileName) {
  return rows.flatMap((row, index) => {
    const description = String(findValue(row, HEADER_ALIASES.description) || 'Bank transaction').trim();
    const date = parseStatementDate(findValue(row, HEADER_ALIASES.date));
    const debit = parseStatementAmount(findValue(row, HEADER_ALIASES.debit));
    const credit = parseStatementAmount(findValue(row, HEADER_ALIASES.credit));
    const rawAmount = parseStatementAmount(findValue(row, HEADER_ALIASES.amount));
    const type = String(findValue(row, HEADER_ALIASES.type)).trim().toLowerCase();
    const isCredit = (credit !== null && credit > 0)
      || /credit|deposit|money in|salary|payment received/.test(type)
      || /^(c|cr)$/.test(type);
    const amount = debit !== null && debit !== 0 ? Math.abs(debit) : rawAmount === null ? null : Math.abs(rawAmount);

    if (!date || amount === null || amount === 0 || isCredit) return [];

    return [createStatementTransaction({
      amount,
      date,
      description,
      fileName,
      index,
      sourceType: 'csv',
    })];
  });
}

export function createStatementTransaction({
  amount,
  date,
  description,
  fileName,
  index,
  sourceType,
}) {
  const externalId = `${sourceType}-${hashStatementValue(`${fileName}|${index}|${date}|${description}|${amount}`)}`;
  return {
    amount: Math.abs(amount),
    category: categoriseTransaction(description),
    externalId,
    included: true,
    name: description,
    sourceFile: fileName,
    tags: ['Bank import'],
    transactionDate: date,
  };
}

function isHeaderCell(value, aliases) {
  return aliases.includes(normaliseHeader(value));
}

function findHeaderRow(matrix) {
  return matrix.slice(0, 40).findIndex((row) => {
    const hasDate = row.some((cell) => isHeaderCell(cell, HEADER_ALIASES.date));
    const hasDescription = row.some((cell) => isHeaderCell(cell, HEADER_ALIASES.description));
    const hasMoney = row.some((cell) =>
      isHeaderCell(cell, [
        ...HEADER_ALIASES.amount,
        ...HEADER_ALIASES.debit,
        ...HEADER_ALIASES.credit,
      ]));
    return hasDate && hasDescription && hasMoney;
  });
}

function normaliseHeaderlessRows(matrix, fileName) {
  const transactionRows = matrix.filter((row) => row.some((cell) => parseStatementDate(cell)));

  return transactionRows.flatMap((row, index) => {
    const dateIndex = row.findIndex((cell) => parseStatementDate(cell));
    const date = parseStatementDate(row[dateIndex]);
    const amountCells = row
      .map((cell, cellIndex) => ({ cell, cellIndex, value: parseStatementAmount(cell) }))
      .filter(({ cell, cellIndex, value }) =>
        cellIndex > dateIndex
        && value !== null
        && /[.,]\d{2}\)?-?$/.test(String(cell).trim()));
    if (!date || !amountCells.length) return [];

    const amountCell = amountCells.length > 1 ? amountCells.at(-2) : amountCells[0];
    if (amountCell.value > 0 && /credit entry|deposit|salary|payment received/i.test(row.join(' '))) return [];

    const description = row
      .slice(dateIndex + 1, amountCell.cellIndex)
      .filter((cell) => parseStatementAmount(cell) === null)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Bank transaction';

    return [createStatementTransaction({
      amount: amountCell.value,
      date,
      description,
      fileName,
      index,
      sourceType: 'csv',
    })];
  });
}

export function parseCsvStatement(text, fileName) {
  const result = Papa.parse(String(text).replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
  });
  const fatalError = result.errors.find((error) => error.type === 'Quotes');
  if (fatalError) throw new Error(`${fileName}: ${fatalError.message}`);

  const matrix = result.data.map((row) => row.map((cell) => String(cell).trim()));
  const headerIndex = findHeaderRow(matrix);

  if (headerIndex >= 0) {
    const headers = matrix[headerIndex];
    const rows = matrix.slice(headerIndex + 1).map((values) =>
      Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, values[index] ?? ''])));
    return normaliseStatementRows(rows, fileName);
  }

  const inferredRows = normaliseHeaderlessRows(matrix, fileName);
  if (inferredRows.length) return inferredRows;

  throw new Error(
    `${fileName}: BudgetR could not recognise the transaction table. Export transaction history as CSV, or choose a text-based PDF statement.`,
  );
}
