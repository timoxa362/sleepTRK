import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTimeEntrySchema, insertSleepSettingsSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Новий API endpoint для отримання місячних метрик
  app.get('/api/metrics/monthly', async (req, res) => {
    try {
      const month = req.query.month as string; // Формат YYYY-MM
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Month must be specified in YYYY-MM format' });
      }
      
      const monthlyData = await storage.getMonthlyMetrics(month);
      res.json(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly metrics:', error);
      res.status(500).json({ error: 'Error fetching monthly metrics' });
    }
  });
  // Get all time entries with optional date filter
  app.get("/api/entries", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const entries = await storage.getTimeEntries(date);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Get all available dates
  app.get("/api/dates", async (req, res) => {
    try {
      const dates = await storage.getAvailableDates();
      res.json(dates);
    } catch (error) {
      console.error("Error fetching dates:", error);
      res.status(500).json({ message: "Failed to fetch dates" });
    }
  });

  // Create a new time entry
  app.post("/api/entries", async (req, res) => {
    try {
      const entry = insertTimeEntrySchema.parse(req.body);
      const newEntry = await storage.createTimeEntry(entry);
      res.status(201).json(newEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      } else {
        console.error("Error creating entry:", error);
        res.status(500).json({ message: "Failed to create entry" });
      }
    }
  });

  // Delete a time entry
  app.delete("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      await storage.deleteTimeEntry(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // Clear time entries for a specific date or all dates
  app.delete("/api/entries", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      await storage.clearTimeEntries(date);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing entries:", error);
      res.status(500).json({ message: "Failed to clear entries" });
    }
  });

  // Get sleep metrics for a specific date
  app.get("/api/metrics", async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const metrics = await storage.calculateSleepMetrics(date);
      res.json(metrics);
    } catch (error) {
      console.error("Error calculating metrics:", error);
      res.status(500).json({ message: "Failed to calculate sleep metrics" });
    }
  });
  
  // Get sleep settings
  app.get("/api/settings/sleep", async (req, res) => {
    try {
      const settings = await storage.getSleepSettings();
      res.json(settings || { requiredSleepMinutes: 0 });
    } catch (error) {
      console.error("Error fetching sleep settings:", error);
      res.status(500).json({ message: "Failed to fetch sleep settings" });
    }
  });
  
  // Create or update sleep settings
  app.post("/api/settings/sleep", async (req, res) => {
    try {
      const settings = insertSleepSettingsSchema.parse(req.body);
      const updatedSettings = await storage.createOrUpdateSleepSettings(settings);
      res.status(200).json(updatedSettings);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        console.error("Error updating sleep settings:", error);
        res.status(500).json({ message: "Failed to update sleep settings" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
