import { pgTable, text, uuid, timestamp, numeric, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  name: text("name"),
  market: text("market").notNull(),
  side: text("side").notNull().default("long"),
  status: text("status").notNull().default("open"),
  quantity: numeric("quantity", { precision: 28, scale: 8 }).notNull(),
  entryPrice: numeric("entry_price", { precision: 28, scale: 8 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 28, scale: 8 }),
  entryAt: timestamp("entry_at", { withTimezone: true }).notNull(),
  exitAt: timestamp("exit_at", { withTimezone: true }),
  fees: numeric("fees", { precision: 20, scale: 6 }).notNull().default("0"),
  stopLoss: numeric("stop_loss", { precision: 28, scale: 8 }),
  target: numeric("target", { precision: 28, scale: 8 }),
  setup: text("setup"),
  notes: text("notes"),
  mood: text("mood"),
  rating: integer("rating"),
  tags: text("tags").array().notNull().default([]),
  riskAmount: numeric("risk_amount", { precision: 20, scale: 6 }),
  preTradePlan: text("pre_trade_plan").notNull().default(""),
  entryReason: text("entry_reason").notNull().default(""),
  exitReason: text("exit_reason").notNull().default(""),
  mistake: text("mistake").notNull().default(""),
  lesson: text("lesson").notNull().default(""),
  rulesFollowed: boolean("rules_followed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  mood: text("mood"),
  date: text("date").notNull(),
  tags: text("tags").array().notNull().default([]),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const watchlist = pgTable("watchlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  market: text("market").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dailyCheckins = pgTable("daily_checkins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mood: text("mood"),
  energy: integer("energy"),
  focus: integer("focus"),
  sleepHours: numeric("sleep_hours", { precision: 4, scale: 1 }),
  intention: text("intention").notNull().default(""),
  tradingPlan: text("trading_plan").notNull().default(""),
  reflection: text("reflection").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ dateUserUnique: uniqueIndex("daily_checkins_user_date_idx").on(table.userId, table.date) }));

export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type DailyCheckin = typeof dailyCheckins.$inferSelect;
