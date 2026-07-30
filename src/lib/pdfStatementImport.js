import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {
  createStatementTransaction,
  parseStatementAmount,
  parseStatementDate,
} from './statementImport.js';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MONEY_PATTERN = /(?:R\s*)?\(?-?\d[\d\s,]*[.,]\d{2}\)?-?(?:\s*(?:CR|DR|DB))?$/i;

function groupTextItems(items, pageNumber) {
  const lines = [];

  for (const item of items) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2.5);

    if (!line) {
      line = { pageNumber, tokens: [], y };
      lines.push(line);
    }
    line.tokens.push({ text, x });
  }

  return lines
    .map((line) => ({
      ...line,
      tokens: line.tokens.sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y);
}

function lineText(line) {
  return line.tokens.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim();
}

function findDateAtStart(tokens, fallbackYear) {
  for (let length = 1; length <= Math.min(tokens.length, 3); length += 1) {
    const date = parseStatementDate(
      tokens.slice(0, length).map((token) => token.text).join(' '),
      fallbackYear,
    );
    if (date) return { date, tokenCount: length };
  }
  return null;
}

function findColumns(lines) {
  for (const line of lines) {
    const lower = lineText(line).toLowerCase();
    if (!lower.includes('balance')) continue;

    const findX = (patterns) =>
      line.tokens.find((token) => patterns.some((pattern) => pattern.test(token.text.trim())))?.x;
    const debitX = findX([/^debit$/i, /^money\s*out$/i, /^withdrawals?$/i]);
    const creditX = findX([/^credit$/i, /^money\s*in$/i, /^deposits?$/i]);
    const amountX = findX([/^amount$/i, /^value$/i]);
    const balanceX = findX([/^balance$/i, /^running\s*balance$/i]);

    if (debitX !== undefined || creditX !== undefined || amountX !== undefined) {
      return { amountX, balanceX, creditX, debitX };
    }
  }
  return {};
}

function buildTransactionBlocks(lines, fallbackYear) {
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const foundDate = findDateAtStart(line.tokens, fallbackYear);
    if (foundDate) {
      if (current) blocks.push(current);
      current = {
        date: foundDate.date,
        dateTokenCount: foundDate.tokenCount,
        lines: [line],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function distance(value, target) {
  return target === undefined ? Number.POSITIVE_INFINITY : Math.abs(value - target);
}

function parseBlock(block, columns, fileName, index) {
  const tokens = block.lines.flatMap((line, lineIndex) =>
    line.tokens.map((token, tokenIndex) => ({
      ...token,
      isDateToken: lineIndex === 0 && tokenIndex < block.dateTokenCount,
    })));
  const moneyTokens = tokens
    .filter((token) => MONEY_PATTERN.test(token.text.trim()))
    .map((token) => ({ ...token, amount: parseStatementAmount(token.text.replace(/\s*(CR|DR|DB)$/i, '')) }))
    .filter((token) => token.amount !== null);
  if (!moneyTokens.length) return null;

  const balanceToken = columns.balanceX === undefined
    ? (moneyTokens.length > 1 ? moneyTokens[moneyTokens.length - 1] : null)
    : moneyTokens.reduce((closest, token) => {
        if (!closest) return token;
        return distance(token.x, columns.balanceX) < distance(closest.x, columns.balanceX) ? token : closest;
      }, null);
  const transactionMoney = moneyTokens.filter((token) => token !== balanceToken);
  const candidates = transactionMoney.length ? transactionMoney : moneyTokens;
  let amountToken = candidates[0];
  let isCredit = false;

  if (columns.debitX !== undefined || columns.creditX !== undefined) {
    amountToken = candidates.reduce((closest, token) => {
      const tokenDistance = Math.min(distance(token.x, columns.debitX), distance(token.x, columns.creditX));
      const closestDistance = Math.min(distance(closest.x, columns.debitX), distance(closest.x, columns.creditX));
      return tokenDistance < closestDistance ? token : closest;
    }, candidates[0]);
    isCredit = distance(amountToken.x, columns.creditX) < distance(amountToken.x, columns.debitX);
  } else if (columns.amountX !== undefined) {
    amountToken = candidates.reduce((closest, token) =>
      distance(token.x, columns.amountX) < distance(closest.x, columns.amountX) ? token : closest, candidates[0]);
  } else if (candidates.length > 1) {
    amountToken = candidates[candidates.length - 1];
  }

  const blockText = tokens.map((token) => token.text).join(' ');
  const typeToken = tokens.find((token) => /^(C|CR|CREDIT|D|DR|DB|DEBIT)$/i.test(token.text.trim()));
  if (/^(C|CR|CREDIT)$/i.test(typeToken?.text || '')) isCredit = true;
  if (/^(D|DR|DB|DEBIT)$/i.test(typeToken?.text || '')) isCredit = false;
  if (/\sCR$/i.test(amountToken.text.trim())) isCredit = true;
  if (/credit entry|deposit|salary|payment received|interest received/i.test(blockText)) isCredit = true;
  if (amountToken.amount === 0 || isCredit) return null;

  const firstMoneyX = Math.min(...moneyTokens.map((token) => token.x));
  const description = tokens
    .filter((token) =>
      !token.isDateToken
      && !MONEY_PATTERN.test(token.text.trim())
      && token.x < firstMoneyX
      && !/^(page|date|description|details|debit|credit|amount|balance|C|CR|D|DR|DB)$/i.test(token.text.trim()))
    .map((token) => token.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Bank transaction';

  return createStatementTransaction({
    amount: amountToken.amount,
    date: block.date,
    description,
    fileName,
    index,
    sourceType: 'pdf',
  });
}

export async function parsePdfStatement(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  let document;

  try {
    document = await getDocument({ data }).promise;
  } catch (error) {
    if (/password/i.test(String(error?.message || error))) {
      throw new Error(`${file.name}: remove the PDF password before importing it.`);
    }
    throw new Error(`${file.name}: BudgetR could not open this PDF.`);
  }

  const lines = [];
  let extractedCharacters = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    extractedCharacters += content.items.reduce((total, item) => total + String(item.str || '').length, 0);
    lines.push(...groupTextItems(content.items, pageNumber));
  }

  if (extractedCharacters < 40) {
    throw new Error(
      `${file.name}: this appears to be a scanned PDF. Download a text-based statement or CSV from your bank.`,
    );
  }

  const years = lines
    .flatMap((line) => lineText(line).match(/\b20\d{2}\b/g) || [])
    .map(Number);
  const fallbackYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const columns = findColumns(lines);
  const rows = buildTransactionBlocks(lines, fallbackYear)
    .map((block, index) => parseBlock(block, columns, file.name, index))
    .filter(Boolean);

  if (!rows.length) {
    throw new Error(
      `${file.name}: no transaction rows were recognised. Try the bank's transaction-history PDF or CSV export.`,
    );
  }

  return rows;
}
