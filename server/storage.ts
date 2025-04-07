import { 
  timeEntries, 
  sleepSettings,
  type TimeEntry, 
  type InsertTimeEntry, 
  type SleepMetrics,
  type SleepSettings,
  type InsertSleepSettings
} from "@shared/schema";
import { timeToMinutes } from "../client/src/lib/utils";
import { db } from "./db";
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export interface MonthlyMetricsData {
  day: string; // День місяця у форматі YYYY-MM-DD
  totalSleepMinutes: number;
  totalAwakeMinutes: number;
  nightSleepMinutes: number;
}

export interface IStorage {
  getTimeEntries(date?: string): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  deleteTimeEntry(id: number): Promise<void>;
  clearTimeEntries(date?: string): Promise<void>;
  calculateSleepMetrics(date: string): Promise<SleepMetrics>;
  getAvailableDates(): Promise<string[]>;
  
  // Новий метод для отримання місячних метрик
  getMonthlyMetrics(month: string): Promise<MonthlyMetricsData[]>;
  
  // Sleep settings methods
  getSleepSettings(): Promise<SleepSettings | undefined>;
  createOrUpdateSleepSettings(settings: InsertSleepSettings): Promise<SleepSettings>;
}

export class DatabaseStorage implements IStorage {
  async getMonthlyMetrics(month: string): Promise<MonthlyMetricsData[]> {
    // Отримуємо всі дати для вказаного місяця і наступного місяця (для розрахунку нічного сну)
    // Формат month: YYYY-MM
    const startDate = `${month}-01`;
    const nextMonth = month.split('-')[1] === '12' 
      ? `${parseInt(month.split('-')[0]) + 1}-01` 
      : `${month.split('-')[0]}-${(parseInt(month.split('-')[1]) + 1).toString().padStart(2, '0')}`;
    const endDate = `${nextMonth}-01`;
    
    // Для розрахунку нічного сну потрібні також записи з першого дня наступного місяця
    const endDateInclusive = new Date(endDate);
    endDateInclusive.setDate(endDateInclusive.getDate() + 1);
    const endDateInclusiveStr = endDateInclusive.toISOString().split('T')[0];
    
    // Отримуємо всі записи за вказаний місяць та перший день наступного місяця
    const allEntries = await db.select()
      .from(timeEntries)
      .where(
        and(
          sql`${timeEntries.date} >= ${startDate}`,
          sql`${timeEntries.date} <= ${endDateInclusiveStr}`
        )
      )
      .orderBy(asc(timeEntries.date), asc(timeEntries.time));

    // Групуємо записи за датою
    const entriesByDate = allEntries.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    // Обчислюємо метрики для кожної дати
    const result: MonthlyMetricsData[] = [];
    
    // Відсортуємо дати для обробки
    const sortedDates = Object.keys(entriesByDate).sort();
    
    // Опрацьовуємо кожну дату в місяці (крім першого дня наступного місяця)
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      
      // Пропускаємо дати з наступного місяця (вони потрібні лише для розрахунку нічного сну)
      if (date >= endDate) continue;
      
      const entries = entriesByDate[date];
      
      // Розрахунок метрик для цієї дати
      let totalSleepMinutes = 0;
      let totalAwakeMinutes = 0;
      let nightSleepMinutes = 0;

      if (entries.length < 2) {
        // Недостатньо даних для розрахунку загального часу сну та бадьорості
        // Але все одно спробуємо розрахувати нічний сон, якщо можливо
        
        // Для правильного розрахунку нічного сну потрібно знайти останній запис "заснув"
        let nightSleepEntry: TimeEntry | null = null;
        for (let j = entries.length - 1; j >= 0; j--) {
          if (entries[j].type === 'fell-asleep') {
            nightSleepEntry = entries[j];
            break;
          }
        }
        
        // Якщо є запис засинання і дата не є останньою у місяці
        const nextDateIndex = i + 1;
        if (nightSleepEntry && nextDateIndex < sortedDates.length) {
          const nextDate = sortedDates[nextDateIndex];
          const nextDayEntries = entriesByDate[nextDate];
          
          // Шукаємо перше пробудження наступного дня
          let morningWakeEntry: TimeEntry | null = null;
          for (const entry of nextDayEntries || []) {
            if (entry.type === 'woke-up') {
              morningWakeEntry = entry;
              break;
            }
          }
          
          // Якщо знайдено пробудження наступного дня
          if (morningWakeEntry) {
            const nightStartTime = timeToMinutes(nightSleepEntry.time);
            const morningWakeTime = timeToMinutes(morningWakeEntry.time);
            
            // Розрахунок нічного сну (завжди через північ)
            nightSleepMinutes = (24 * 60 - nightStartTime) + morningWakeTime;
          }
        }
        
        result.push({
          day: date,
          totalSleepMinutes,
          totalAwakeMinutes,
          nightSleepMinutes
        });
        continue;
      }

      // Розраховуємо загальний час сну та неспання
      for (let j = 0; j < entries.length - 1; j++) {
        const currentEntry = entries[j];
        const nextEntry = entries[j + 1];

        const startTime = timeToMinutes(currentEntry.time);
        const endTime = timeToMinutes(nextEntry.time);
        
        // Обробка переходу через північ
        let duration = endTime - startTime;
        if (duration < 0) {
          duration = (24 * 60 - startTime) + endTime;
        }

        if (currentEntry.type === 'woke-up' && nextEntry.type === 'fell-asleep') {
          // Це період неспання
          totalAwakeMinutes += duration;
        } else if (currentEntry.type === 'fell-asleep' && nextEntry.type === 'woke-up') {
          // Це період сну
          totalSleepMinutes += duration;
        }
      }

      // Для правильного розрахунку нічного сну:
      // 1. Знаходимо останній запис "заснув" для поточного дня
      // 2. Шукаємо перший запис "прокинувся" для наступного дня
      
      // Останній запис "заснув" для поточного дня
      let nightSleepEntry: TimeEntry | null = null;
      for (let j = entries.length - 1; j >= 0; j--) {
        if (entries[j].type === 'fell-asleep') {
          nightSleepEntry = entries[j];
          break;
        }
      }
      
      // Якщо є запис засинання і дата не є останньою у місяці
      const nextDateIndex = i + 1;
      if (nightSleepEntry && nextDateIndex < sortedDates.length) {
        const nextDate = sortedDates[nextDateIndex];
        const nextDayEntries = entriesByDate[nextDate];
        
        // Шукаємо перше пробудження наступного дня
        let morningWakeEntry: TimeEntry | null = null;
        for (const entry of nextDayEntries || []) {
          if (entry.type === 'woke-up') {
            morningWakeEntry = entry;
            break;
          }
        }
        
        // Якщо знайдено пробудження наступного дня
        if (morningWakeEntry) {
          const nightStartTime = timeToMinutes(nightSleepEntry.time);
          const morningWakeTime = timeToMinutes(morningWakeEntry.time);
          
          // Розрахунок нічного сну (завжди через північ)
          nightSleepMinutes = (24 * 60 - nightStartTime) + morningWakeTime;
        }
      }
      
      // Якщо нічний сон все ще не вдалося розрахувати, використовуємо стару логіку
      if (nightSleepMinutes === 0) {
        // Перше ранкове пробудження
        const firstIsWakeUp = entries[0].type === 'woke-up';
        let morningWakeTime: string | null = null;
        if (firstIsWakeUp) {
          morningWakeTime = entries[0].time;
        }

        // Останнє засинання дня
        let nightSleepStart: string | null = null;
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.type === 'fell-asleep') {
          nightSleepStart = lastEntry.time;
        }

        // Розраховуємо нічний сон, якщо є час початку та закінчення
        if (nightSleepStart && morningWakeTime) {
          const nightStart = timeToMinutes(nightSleepStart);
          const morningWake = timeToMinutes(morningWakeTime);

          // Обробка переходу через північ
          if (morningWake < nightStart) {
            nightSleepMinutes = (24 * 60 - nightStart) + morningWake;
          } else {
            nightSleepMinutes = morningWake - nightStart;
          }
        }
      }

      result.push({
        day: date,
        totalSleepMinutes,
        totalAwakeMinutes,
        nightSleepMinutes
      });
    }

    return result;
  }
  async getTimeEntries(date?: string): Promise<TimeEntry[]> {
    if (date) {
      return db.select()
        .from(timeEntries)
        .where(eq(timeEntries.date, date))
        .orderBy(asc(timeEntries.time));
    } else {
      return db.select()
        .from(timeEntries)
        .orderBy(desc(timeEntries.date), asc(timeEntries.time));
    }
  }

  async createTimeEntry(insertEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [entry] = await db
      .insert(timeEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, id));
  }

  async clearTimeEntries(date?: string): Promise<void> {
    if (date) {
      await db
        .delete(timeEntries)
        .where(eq(timeEntries.date, date));
    } else {
      await db
        .delete(timeEntries);
    }
  }

  async getAvailableDates(): Promise<string[]> {
    const result = await db
      .select({ date: timeEntries.date })
      .from(timeEntries)
      .groupBy(timeEntries.date)
      .orderBy(desc(timeEntries.date));
    
    return result.map(item => {
      // Convert the date to a string in YYYY-MM-DD format
      const date = new Date(item.date);
      return date.toISOString().split('T')[0];
    });
  }

  async calculateSleepMetrics(date: string): Promise<SleepMetrics> {
    // Default metrics
    let totalSleepMinutes = 0;
    let totalAwakeMinutes = 0;
    let nightSleepMinutes = 0;

    // Get all entries for the specific date, sorted by time
    const entries = await this.getTimeEntries(date);
    
    // Get sleep settings for required sleep calculation
    const settings = await this.getSleepSettings();
    let requiredSleepMinutes = settings?.requiredSleepMinutes;
    const scheduledNapTime = settings?.scheduledNapTime;
    const scheduledBedtime = settings?.scheduledBedtime;

    // Check if we need to calculate average sleep
    if (requiredSleepMinutes && requiredSleepMinutes < 0) {
      // Calculate average sleep over past days
      const daysToAverage = Math.abs(requiredSleepMinutes);
      requiredSleepMinutes = await this.calculateAverageSleepTime(date, daysToAverage);
    }

    if (entries.length < 2) {
      // Not enough data to calculate metrics
      return { 
        totalSleepMinutes, 
        totalAwakeMinutes, 
        nightSleepMinutes,
        date,
        requiredSleepMinutes,
        sleepCompletionPercentage: 0
      };
    }

    // Check if entries start with wake-up
    const firstIsWakeUp = entries[0].type === 'woke-up';

    // Calculate total sleep and awake times
    for (let i = 0; i < entries.length - 1; i++) {
      const currentEntry = entries[i];
      const nextEntry = entries[i + 1];

      const startTime = timeToMinutes(currentEntry.time);
      const endTime = timeToMinutes(nextEntry.time);
      
      // Handle overnight crossing
      let duration = endTime - startTime;
      if (duration < 0) {
        // If end time is earlier than start time, assume it's the next day
        duration = (24 * 60 - startTime) + endTime;
      }

      if (currentEntry.type === 'woke-up' && nextEntry.type === 'fell-asleep') {
        // This is an awake period
        totalAwakeMinutes += duration;
      } else if (currentEntry.type === 'fell-asleep' && nextEntry.type === 'woke-up') {
        // This is a sleep period
        totalSleepMinutes += duration;
      }
    }

    // Для правильного розрахунку нічного сну:
    // 1. Знаходимо перше пробудження поточного дня
    // 2. Знаходимо останній запис "заснув" для попереднього дня

    // Перше пробудження поточного дня
    let morningWakeEntry: TimeEntry | null = null;
    for (const entry of entries) {
      if (entry.type === 'woke-up') {
        morningWakeEntry = entry;
        break;
      }
    }

    // Якщо є запис пробудження в поточний день
    if (morningWakeEntry) {
      const morningWakeTime = timeToMinutes(morningWakeEntry.time);
      
      // Перетворення дати у об'єкт
      const currentDate = new Date(date);
      
      // Розрахунок попередньої дати
      const previousDay = new Date(currentDate);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayString = previousDay.toISOString().split('T')[0];
      
      // Отримуємо записи для попереднього дня
      const previousDayEntries = await this.getTimeEntries(previousDayString);
      
      // Шукаємо останній запис "заснув" для попереднього дня
      let nightSleepEntry: TimeEntry | null = null;
      for (let i = previousDayEntries.length - 1; i >= 0; i--) {
        if (previousDayEntries[i].type === 'fell-asleep') {
          nightSleepEntry = previousDayEntries[i];
          break;
        }
      }
      
      // Якщо знайдено запис засинання попереднього дня
      if (nightSleepEntry) {
        const nightStartTime = timeToMinutes(nightSleepEntry.time);
        
        // Розрахунок нічного сну (з урахуванням переходу через північ)
        nightSleepMinutes = (24 * 60 - nightStartTime) + morningWakeTime;
      }
    }
    
    // Якщо не вдалося знайти потрібні записи (немає запису засинання або пробудження)
    // можемо спробувати альтернативний підхід з поточними даними
    if (nightSleepMinutes === 0) {
      // First morning wake up
      let morningWakeTime: string | null = null;
      if (firstIsWakeUp) {
        morningWakeTime = entries[0].time;
      }

      // Last sleep time of the day
      let nightSleepStart: string | null = null;
      const lastEntry = entries[entries.length - 1];
      if (lastEntry.type === 'fell-asleep') {
        nightSleepStart = lastEntry.time;
      }

      // Calculate night sleep if we have start and end times
      if (nightSleepStart && morningWakeTime) {
        const nightStart = timeToMinutes(nightSleepStart);
        const morningWake = timeToMinutes(morningWakeTime);

        // Handle overnight crossing (if morning time is less than night time)
        if (morningWake < nightStart) {
          nightSleepMinutes = (24 * 60 - nightStart) + morningWake;
        } else {
          nightSleepMinutes = morningWake - nightStart;
        }
      }
    }

    // Calculate sleep completion percentage if required sleep is available
    let sleepCompletionPercentage: number | undefined = undefined;
    if (requiredSleepMinutes && requiredSleepMinutes > 0) {
      sleepCompletionPercentage = Math.min(100, Math.round((totalSleepMinutes / requiredSleepMinutes) * 100));
    }

    // Calculate time to next scheduled sleep (nap or bedtime)
    let timeToNextScheduledSleep: { minutes: number; type: 'nap' | 'bedtime' } | undefined = undefined;
    
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Check if selected date is today
    const selectedDate = new Date(date);
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (isToday) {
      let napTimeInMinutes: number | null = null;
      let bedtimeInMinutes: number | null = null;
      
      if (scheduledNapTime) {
        const [napHour, napMinute] = scheduledNapTime.split(':').map(Number);
        napTimeInMinutes = napHour * 60 + napMinute;
      }
      
      if (scheduledBedtime) {
        const [bedHour, bedMinute] = scheduledBedtime.split(':').map(Number);
        bedtimeInMinutes = bedHour * 60 + bedMinute;
      }
      
      // For both scheduled times, calculate minutes until each
      let minutesToNap: number | null = null;
      let minutesToBedtime: number | null = null;
      
      if (napTimeInMinutes !== null) {
        minutesToNap = napTimeInMinutes > currentTimeInMinutes 
          ? napTimeInMinutes - currentTimeInMinutes 
          : (24 * 60 - currentTimeInMinutes) + napTimeInMinutes;
      }
      
      if (bedtimeInMinutes !== null) {
        minutesToBedtime = bedtimeInMinutes > currentTimeInMinutes 
          ? bedtimeInMinutes - currentTimeInMinutes 
          : (24 * 60 - currentTimeInMinutes) + bedtimeInMinutes;
      }
      
      // Choose the closest sleep time
      if (minutesToNap !== null && minutesToBedtime !== null) {
        if (minutesToNap < minutesToBedtime) {
          timeToNextScheduledSleep = { minutes: minutesToNap, type: 'nap' };
        } else {
          timeToNextScheduledSleep = { minutes: minutesToBedtime, type: 'bedtime' };
        }
      } else if (minutesToNap !== null) {
        timeToNextScheduledSleep = { minutes: minutesToNap, type: 'nap' };
      } else if (minutesToBedtime !== null) {
        timeToNextScheduledSleep = { minutes: minutesToBedtime, type: 'bedtime' };
      }
    }

    return {
      totalSleepMinutes,
      totalAwakeMinutes,
      nightSleepMinutes,
      date,
      requiredSleepMinutes,
      sleepCompletionPercentage,
      timeToNextScheduledSleep
    };
  }
  
  async getSleepSettings(): Promise<SleepSettings | undefined> {
    // Get the first (and should be only) sleep settings record
    const settings = await db
      .select()
      .from(sleepSettings)
      .limit(1);
    
    return settings[0];
  }
  
  async createOrUpdateSleepSettings(insertSettings: InsertSleepSettings): Promise<SleepSettings> {
    // Check if settings already exist
    const existingSettings = await this.getSleepSettings();
    
    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(sleepSettings)
        .set({
          ...insertSettings,
          updatedAt: new Date()
        })
        .where(eq(sleepSettings.id, existingSettings.id))
        .returning();
      
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(sleepSettings)
        .values(insertSettings)
        .returning();
      
      return created;
    }
  }
  
  /**
   * Обчислює середню тривалість сну за вказану кількість днів
   * Використовується, коли в налаштуваннях вказано від'ємне значення
   */
  async calculateAverageSleepTime(currentDate: string, daysToAverage: number): Promise<number> {
    // Отримуємо доступні дати сортовані в порядку спадання (найновіші спочатку)
    const availableDates = await this.getAvailableDates();
    
    // Фільтруємо дати, які не перевищують поточну дату, максимум daysToAverage днів
    const targetDates = availableDates
      .filter(date => date <= currentDate)
      .slice(0, daysToAverage);
    
    if (targetDates.length === 0) {
      // Якщо дат немає, повертаємо значення за замовчуванням
      return 720; // 12 годин як значення за замовчуванням
    }
    
    // Обчислюємо метрики для кожної дати
    let totalSleepMinutes = 0;
    let datesToCalculate = 0;
    
    for (const date of targetDates) {
      // Отримуємо записи для цієї дати
      const entries = await this.getTimeEntries(date);
      
      if (entries.length >= 2) {
        // Обчислюємо загальний час сну для цієї дати
        let sleepMinutes = 0;
        
        for (let i = 0; i < entries.length - 1; i++) {
          const currentEntry = entries[i];
          const nextEntry = entries[i + 1];
          
          if (currentEntry.type === 'fell-asleep' && nextEntry.type === 'woke-up') {
            const startTime = timeToMinutes(currentEntry.time);
            const endTime = timeToMinutes(nextEntry.time);
            
            // Обробка переходу через північ
            let duration = endTime - startTime;
            if (duration < 0) {
              duration = (24 * 60 - startTime) + endTime;
            }
            
            sleepMinutes += duration;
          }
        }
        
        totalSleepMinutes += sleepMinutes;
        datesToCalculate++;
      }
    }
    
    // Обчислюємо середнє значення, якщо є хоча б один день з даними
    if (datesToCalculate > 0) {
      return Math.round(totalSleepMinutes / datesToCalculate);
    }
    
    // Якщо немає днів з достатньою кількістю даних
    return 720; // 12 годин як значення за замовчуванням
  }
}

export const storage = new DatabaseStorage();
