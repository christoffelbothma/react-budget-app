import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  budgetMonths: defineTable({
    userId: v.id("users"),
    monthStart: v.string(),
    budgetAmount: v.number(),
    legacyId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_month", ["userId", "monthStart"]),
  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    legacyId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),
  transactions: defineTable({
    userId: v.id("users"),
    budgetMonthId: v.optional(v.id("budgetMonths")),
    categoryId: v.optional(v.id("categories")),
    debitOrderId: v.optional(v.id("debitOrders")),
    category: v.string(),
    name: v.string(),
    tags: v.array(v.string()),
    amount: v.number(),
    transactionDate: v.string(),
    source: v.optional(v.string()),
    sourceFile: v.optional(v.string()),
    externalId: v.optional(v.string()),
    legacyId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "transactionDate"])
    .index("by_user_and_external_id", ["userId", "externalId"])
    .index("by_user_and_legacy_id", ["userId", "legacyId"]),
  debitOrders: defineTable({
    userId: v.id("users"),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    amount: v.number(),
    dayOfMonth: v.number(),
    autoAddMonthly: v.boolean(),
    lastAutoAddedMonth: v.optional(v.string()),
    legacyId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_legacy_id", ["userId", "legacyId"]),
});
