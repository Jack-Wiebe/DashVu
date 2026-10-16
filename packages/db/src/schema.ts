import type { AdapterAccountType } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Auth.js core tables. Column names match what `@auth/drizzle-adapter`
 * expects so the tables can be passed to `DrizzleAdapter` directly.
 */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/**
 * Application tables for user configuration.
 */

export const dashboards = pgTable("dashboard", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("My Dashboard"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/**
 * A per-user, per-kind widget instance. It owns the widget's display name, its
 * settings, and its content. Widgets that point at the same group share all of
 * that across dashboards; the default group makes every widget of a kind shared
 * until it is pointed at another instance.
 */
export const widgetGroups = pgTable(
  "widgetGroup",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    isDefault: boolean("isDefault").notNull().default(false),
    settings: jsonb("settings").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (group) => [
    uniqueIndex("widgetGroup_default_idx")
      .on(group.userId, group.kind)
      .where(sql`${group.isDefault}`),
    index("widgetGroup_userId_idx").on(group.userId),
  ]
);

/**
 * A widget placement: an instance (`groupId`) shown on a dashboard. Layout
 * (`position`, `size`) lives here because the same instance can be placed
 * differently on each dashboard; everything else lives on the instance.
 */
export const widgets = pgTable("widget", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  dashboardId: text("dashboardId")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  groupId: text("groupId")
    .notNull()
    .references(() => widgetGroups.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  position: integer("position").notNull().default(0),
  size: text("size").notNull().default("lg:col-span-1"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const userPreferences = pgTable("userPreferences", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  lastActiveDeviceId: text("lastActiveDeviceId"),
  activeDashboardId: text("activeDashboardId").references(() => dashboards.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Generic per-group content items (e.g. the planner widget's notes, todos, and
 * countdowns). `mode` separates the item lists within a single widget group.
 */
export const widgetItems = pgTable(
  "widgetItem",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groupId: text("groupId")
      .notNull()
      .references(() => widgetGroups.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    position: integer("position").notNull().default(0),
    text: text("text").notNull(),
    checked: boolean("checked").notNull().default(false),
    date: timestamp("date", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (item) => [index("widgetItem_groupId_mode_idx").on(item.groupId, item.mode)]
);
