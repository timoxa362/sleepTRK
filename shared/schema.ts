import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define time entry table
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ['woke-up', 'fell-asleep'] }).notNull(),
  time: text("time").notNull(), // HH:MM format
  date: date("date").notNull(), // YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define sleep settings table
export const sleepSettings = pgTable("sleep_settings", {
  id: serial("id").primaryKey(),
  requiredSleepMinutes: integer("required_sleep_minutes").notNull(), // Required amount of sleep in minutes
  scheduledNapTime: text("scheduled_nap_time"), // Optional scheduled nap time in HH:MM format
  scheduledBedtime: text("scheduled_bedtime"), // Optional scheduled bedtime in HH:MM format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schema for time entries
export const insertTimeEntrySchema = createInsertSchema(timeEntries).pick({
  type: true,
  time: true,
  date: true,
});

// Create insert schema for sleep settings
export const insertSleepSettingsSchema = createInsertSchema(sleepSettings).pick({
  requiredSleepMinutes: true,
  scheduledNapTime: true,
  scheduledBedtime: true,
});

// Types
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertSleepSettings = z.infer<typeof insertSleepSettingsSchema>;
export type SleepSettings = typeof sleepSettings.$inferSelect;

// Define Sleep metrics
export interface SleepMetrics {
  totalSleepMinutes: number;
  totalAwakeMinutes: number;
  nightSleepMinutes: number;
  date: string; // YYYY-MM-DD format
  sleepCompletionPercentage?: number; // Percentage of required sleep completed
  requiredSleepMinutes?: number; // Required amount of sleep in minutes
  timeToNextScheduledSleep?: {
    minutes: number;
    type: 'nap' | 'bedtime';
  }; // Time until next scheduled sleep (nap or bedtime)
}
