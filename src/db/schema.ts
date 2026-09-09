import { pgTable, text, uuid, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";

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
  market: text("market").notNull(), // us | india | forex | crypto | gold
  side: text("side").notNull().default("long"), // long | short
  status: text("status").notNull().default("open"), // open | closed
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
  mood: text("mood"), // great | good | neutral | low | rough
  rating: integer("rating"), // 1-5 self grade
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  mood: text("mood"),
  date: text("date").notNull(), // yyyy-mm-dd
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

export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
