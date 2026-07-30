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
  amount: ['amount', 'transactionamount', 'value'],
  credit: ['credit', 'credits', 'deposit', 'deposits', 'moneyin'],
  date: ['date', 'transactiondate', 'postingdate', 'valuedate'],
  debit: ['debit', 'debits', 'withdrawal', 'withdrawals', 'moneyout'],
  description: ['description', 'details', 'narrative', 'transactiondescription', 'reference', 'memo', 'beneficiary'],
  type: ['type', 'transactiontype', 'creditdebit', 'drcr'],
};

function normaliseHeader(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findValue(row, aliases) {
  const key = Object.keys(row).find((candidate) => aliases.includes(normaliseHeader(candidate)));
  return key ? row[key] : '';
}

function parseAmount(value) {
  const cleaned = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/[R$]/gi, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[()]/g, (match) => (match === '(' ? '-' : ''));
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function parseDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  const localMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  let date;

  if (isoMatch) {
    date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else if (localMatch) {
    let year = Number(localMatch[3]);
    if (year < 100) year += 2000;
    date = new Date(year, Number(localMatch[2]) - 1, Number(localMatch[1]));
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashValue(value) {
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
    const date = parseDate(findValue(row, HEADER_ALIASES.date));
    const debit = parseAmount(findValue(row, HEADER_ALIASES.debit));
    const credit = parseAmount(findValue(row, HEADER_ALIASES.credit));
    const rawAmount = parseAmount(findValue(row, HEADER_ALIASES.amount));
    const type = String(findValue(row, HEADER_ALIASES.type)).toLowerCase();
    const isCredit = (credit !== null && credit > 0) || /credit|deposit|money in|salary|payment received/.test(type);
    const amount = debit !== null && debit !== 0 ? Math.abs(debit) : rawAmount === null ? null : Math.abs(rawAmount);

    if (!date || amount === null || amount === 0 || isCredit) return [];

    const externalId = `csv-${hashValue(`${fileName}|${index}|${date}|${description}|${amount}`)}`;
    return [{
      amount,
      category: categoriseTransaction(description),
      externalId,
      included: true,
      name: description,
      sourceFile: fileName,
      tags: ['Bank import'],
      transactionDate: date,
    }];
  });
}
