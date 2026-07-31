import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CATEGORIES = [
  ["Housing", "#0f6b58"],
  ["Food", "#e7b45f"],
  ["Transport", "#365f91"],
  ["Utilities", "#7d5a50"],
  ["Lifestyle", "#9b3d27"],
  ["Financial", "#365f91"],
  ["Health", "#8b5cf6"],
  ["Education", "#2563eb"],
  ["Shopping", "#d97706"],
  ["Savings", "#16a34a"],
  ["General", "#697284"],
];

async function requireUserId(ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new ConvexError("You must be signed in.");
  }

  return userId;
}

function requireNonNegativeAmount(amount) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ConvexError("Amount must be zero or greater.");
  }
}

async function requireOwnedDocument(ctx, table, id, userId) {
  const document = await ctx.db.get(id);

  if (!document || document.userId !== userId) {
    throw new ConvexError(`${table} was not found.`);
  }

  return document;
}

export const ensureDefaults = mutation({
  args: {
    monthStart: v.string(),
  },
  handler: async (ctx, { monthStart }) => {
    const userId = await requireUserId(ctx);
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingCategories.length === 0) {
      for (const [name, color] of DEFAULT_CATEGORIES) {
        await ctx.db.insert("categories", { color, name, userId });
      }
    }

    const existingMonth = await ctx.db
      .query("budgetMonths")
      .withIndex("by_user_and_month", (q) =>
        q.eq("userId", userId).eq("monthStart", monthStart),
      )
      .unique();

    if (!existingMonth) {
      await ctx.db.insert("budgetMonths", {
        budgetAmount: 0,
        monthStart,
        userId,
      });
    }
  },
});

export const listTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return transactions.map((transaction) => ({
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.transactionDate,
      id: transaction._id,
      name: transaction.name,
      source: transaction.source,
      tags: transaction.tags,
    }));
  },
});

export const getBudgetMonth = query({
  args: { monthStart: v.string() },
  handler: async (ctx, { monthStart }) => {
    const userId = await requireUserId(ctx);
    const budgetMonth = await ctx.db
      .query("budgetMonths")
      .withIndex("by_user_and_month", (q) =>
        q.eq("userId", userId).eq("monthStart", monthStart),
      )
      .unique();

    return budgetMonth
      ? { amount: budgetMonth.budgetAmount, id: budgetMonth._id, monthStart }
      : { amount: 0, id: null, monthStart };
  },
});

export const setMonthlyBudget = mutation({
  args: { amount: v.number(), monthStart: v.string() },
  handler: async (ctx, { amount, monthStart }) => {
    const userId = await requireUserId(ctx);
    requireNonNegativeAmount(amount);
    const existing = await ctx.db
      .query("budgetMonths")
      .withIndex("by_user_and_month", (q) =>
        q.eq("userId", userId).eq("monthStart", monthStart),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { budgetAmount: amount });
      return existing._id;
    }

    return await ctx.db.insert("budgetMonths", { budgetAmount: amount, monthStart, userId });
  },
});

export const addTransaction = mutation({
  args: {
    amount: v.number(),
    category: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    transactionDate: v.string(),
  },
  handler: async (ctx, transaction) => {
    const userId = await requireUserId(ctx);
    requireNonNegativeAmount(transaction.amount);

    return await ctx.db.insert("transactions", {
      ...transaction,
      userId,
    });
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("transactions"),
    amount: v.number(),
    category: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    transactionDate: v.string(),
  },
  handler: async (ctx, { id, ...transaction }) => {
    const userId = await requireUserId(ctx);
    await requireOwnedDocument(ctx, "Transaction", id, userId);
    requireNonNegativeAmount(transaction.amount);
    await ctx.db.patch(id, transaction);
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    await requireOwnedDocument(ctx, "Transaction", id, userId);
    await ctx.db.delete(id);
  },
});

export const importTransactions = mutation({
  args: {
    transactions: v.array(
      v.object({
        amount: v.number(),
        category: v.string(),
        externalId: v.string(),
        name: v.string(),
        sourceFile: v.string(),
        tags: v.array(v.string()),
        transactionDate: v.string(),
      }),
    ),
  },
  handler: async (ctx, { transactions }) => {
    const userId = await requireUserId(ctx);
    let imported = 0;
    let skipped = 0;

    for (const transaction of transactions) {
      requireNonNegativeAmount(transaction.amount);
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_user_and_external_id", (q) =>
          q.eq("userId", userId).eq("externalId", transaction.externalId),
        )
        .unique();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("transactions", {
        ...transaction,
        source: "bank-import",
        userId,
      });
      imported += 1;
    }

    return { imported, skipped };
  },
});

export const listDebitOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const debitOrders = await ctx.db
      .query("debitOrders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return debitOrders.map((debitOrder) => ({
      active: debitOrder.active !== false,
      amount: debitOrder.amount,
      autoAddMonthly: debitOrder.autoAddMonthly,
      category: debitOrder.category,
      dayOfMonth: debitOrder.dayOfMonth,
      id: debitOrder._id,
      name: debitOrder.name,
      tags: debitOrder.tags,
    }));
  },
});

export const addDebitOrder = mutation({
  args: {
    amount: v.number(),
    autoAddMonthly: v.boolean(),
    category: v.string(),
    dayOfMonth: v.number(),
    name: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, debitOrder) => {
    const userId = await requireUserId(ctx);
    requireNonNegativeAmount(debitOrder.amount);

    if (!Number.isInteger(debitOrder.dayOfMonth) || debitOrder.dayOfMonth < 1 || debitOrder.dayOfMonth > 31) {
      throw new ConvexError("Debit day must be between 1 and 31.");
    }

    return await ctx.db.insert("debitOrders", {
      ...debitOrder,
      active: true,
      userId,
    });
  },
});

export const updateDebitOrder = mutation({
  args: {
    id: v.id("debitOrders"),
    active: v.boolean(),
    amount: v.number(),
    autoAddMonthly: v.boolean(),
    category: v.string(),
    dayOfMonth: v.number(),
    name: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { id, ...debitOrder }) => {
    const userId = await requireUserId(ctx);
    await requireOwnedDocument(ctx, "Debit order", id, userId);
    requireNonNegativeAmount(debitOrder.amount);
    if (!Number.isInteger(debitOrder.dayOfMonth) || debitOrder.dayOfMonth < 1 || debitOrder.dayOfMonth > 31) {
      throw new ConvexError("Debit day must be between 1 and 31.");
    }
    await ctx.db.patch(id, debitOrder);
  },
});

export const deleteDebitOrder = mutation({
  args: { id: v.id("debitOrders") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    await requireOwnedDocument(ctx, "Debit order", id, userId);
    await ctx.db.delete(id);
  },
});

export const syncMonthlyDebitOrders = mutation({
  args: {
    currentMonth: v.string(),
    transactionDate: v.string(),
  },
  handler: async (ctx, { currentMonth, transactionDate }) => {
    const userId = await requireUserId(ctx);
    const debitOrders = await ctx.db
      .query("debitOrders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let added = 0;

    const currentDay = Number(transactionDate.slice(8, 10));
    const [year, month] = currentMonth.split("-").map(Number);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    for (const debitOrder of debitOrders) {
      const scheduledDay = Math.min(debitOrder.dayOfMonth, lastDayOfMonth);
      if (
        debitOrder.active === false
        || !debitOrder.autoAddMonthly
        || debitOrder.lastAutoAddedMonth === currentMonth
        || currentDay < scheduledDay
      ) {
        continue;
      }

      await ctx.db.insert("transactions", {
        amount: debitOrder.amount,
        category: debitOrder.category,
        debitOrderId: debitOrder._id,
        name: debitOrder.name,
        tags: debitOrder.tags,
        transactionDate: `${currentMonth}-${String(scheduledDay).padStart(2, "0")}`,
        userId,
      });
      await ctx.db.patch(debitOrder._id, { lastAutoAddedMonth: currentMonth });
      added += 1;
    }

    return added;
  },
});
