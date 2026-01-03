import { pgEnum, pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const itemTypeEnum = pgEnum('item_type', ['VINYL', 'CD', 'BOOK']);
export const statusEnum = pgEnum('status', [
  'UNPROCESSED',
  'IDENTIFIED',
  'READY',
  'LISTED',
  'SOLD',
]);

export const rankEnum = pgEnum('rank', ['N', 'R', 'SR', 'SSR', 'UR']);

export const captureKindEnum = pgEnum('capture_kind', [
  'front',
  'back',
  'spine',
  'label',
  'other',
]);

export const items = pgTable('items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sku: text('sku').notNull().unique(),
  itemType: itemTypeEnum('item_type').notNull(),
  status: statusEnum('status').notNull().default('UNPROCESSED'),
  rank: rankEnum('rank').notNull().default('N'),
  title: text('title'),
  artist: text('artist'),
  catalogNo: text('catalog_no'),
  notes: text('notes').default(''),
  storageLocation: text('storage_location'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});

export const captures = pgTable('captures', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  kind: captureKindEnum('kind').notNull(),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
});

export const saved_views = pgTable('saved_views', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  filters: jsonb('filters').notNull(),
  sort: jsonb('sort'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});
