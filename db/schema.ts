import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

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
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google' or 'microsoft'
  email: text("email").notNull(),
  account_name: text("account_name"),
  color: varchar("color", { length: 7 }), // Stores hex colors like #FF0000
  refresh_token: text("refresh_token").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  last_synced: timestamp("last_synced"),
  // New subscription fields for push notifications:
  webhook_channel_id: text("webhook_channel_id"), // Unique channel ID for webhook subscription
  webhook_resource_id: text("webhook_resource_id"), // Resource ID returned by the calendar API
  webhook_expiration: timestamp("webhook_expiration"), // Expiration timestamp for the subscription
});

// Meetings table
export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Reference to the main user
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Reference to the linked account
    linked_account_id: uuid("linked_account_id")
      .notNull()
      .references(() => linkedAccounts.id, { onDelete: "cascade" }),
    // External provider's event ID
    external_event_id: text("external_event_id").notNull(),
    // Provider (redundant but useful for quick access)
    provider: varchar("provider", { length: 50 }).notNull(),
    // Event details
    name: text("name"),
    start_date: text("start_date").notNull(),
    end_date: text("end_date").notNull(),
    attendees: jsonb("attendees"),
    location: text("location"),
    link: text("link"),
    message: text("message"),
    status: text("status"),
    // Timestamps
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    unique_external_provider: uniqueIndex("unique_external_provider").on(
      table.external_event_id,
      table.provider,
      table.linked_account_id
    ),
  })
);

// Export types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type LinkedAccount = InferSelectModel<typeof linkedAccounts>;
export type NewLinkedAccount = InferInsertModel<typeof linkedAccounts>;

export type Meeting = InferSelectModel<typeof meetings>;
export type NewMeeting = InferInsertModel<typeof meetings>;
