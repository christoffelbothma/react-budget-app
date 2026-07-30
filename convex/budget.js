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
        budgetAmount: 18500,
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
      userId,
    });
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

    for (const debitOrder of debitOrders) {
      if (!debitOrder.autoAddMonthly || debitOrder.lastAutoAddedMonth === currentMonth) {
        continue;
      }

      await ctx.db.insert("transactions", {
        amount: debitOrder.amount,
        category: debitOrder.category,
        debitOrderId: debitOrder._id,
        name: debitOrder.name,
        tags: debitOrder.tags,
        transactionDate,
        userId,
      });
      await ctx.db.patch(debitOrder._id, { lastAutoAddedMonth: currentMonth });
      added += 1;
    }

    return added;
  },
});
