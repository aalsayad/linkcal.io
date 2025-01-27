import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  full_name: text("full_name"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  user_metadata: jsonb("user_metadata"),
});

// Linked Accounts table
export const linkedAccounts = pgTable("linked_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google' or 'microsoft'
  email: text("email").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
