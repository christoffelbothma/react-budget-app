import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const transaction = v.object({
  amount: v.number(),
  category: v.string(),
  legacyId: v.string(),
  name: v.string(),
  tags: v.array(v.string()),
  transactionDate: v.string(),
});

const debitOrder = v.object({
  amount: v.number(),
  autoAddMonthly: v.boolean(),
  category: v.string(),
  dayOfMonth: v.number(),
  lastAutoAddedMonth: v.optional(v.string()),
  legacyId: v.string(),
  name: v.string(),
  tags: v.array(v.string()),
});

export const importSupabaseData = mutation({
  args: {
    debitOrders: v.array(debitOrder),
    transactions: v.array(transaction),
  },
  handler: async (ctx, data) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("Sign in before importing data.");
    }

    let debitOrdersImported = 0;
    let transactionsImported = 0;

    for (const item of data.transactions) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_user_and_legacy_id", (q) =>
          q.eq("userId", userId).eq("legacyId", item.legacyId),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("transactions", { ...item, userId });
        transactionsImported += 1;
      }
    }

    for (const item of data.debitOrders) {
      const existing = await ctx.db
        .query("debitOrders")
        .withIndex("by_user_and_legacy_id", (q) =>
          q.eq("userId", userId).eq("legacyId", item.legacyId),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("debitOrders", { ...item, userId });
        debitOrdersImported += 1;
      }
    }

    return { debitOrdersImported, transactionsImported };
  },
});
