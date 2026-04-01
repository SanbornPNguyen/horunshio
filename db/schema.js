import { pgTable, serial, varchar, integer, numeric, text, timestamp, date } from 'drizzle-orm/pg-core'

export const runners = pgTable('runners', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const runs = pgTable('runs', {
  id: serial('id').primaryKey(),
  runnerId: integer('runner_id').notNull().references(() => runners.id),
  eventName: varchar('event_name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  km: numeric('km', { precision: 6, scale: 2 }).notNull(),
  timeSeconds: integer('time_seconds').notNull(),
  link: text('link'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
})
