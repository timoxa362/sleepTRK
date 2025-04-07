import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SummaryCards } from "@/components/summary-cards";
import { TimeEntryForm } from "@/components/time-entry-form";
import { TimelineDisplay } from "@/components/timeline-display";
import { DateSelector } from "@/components/date-selector";
import { HelpCard } from "@/components/help-card";
import { SleepSettingsForm } from "@/components/sleep-settings-form";
import { MonthlySleepChart } from "@/components/monthly-sleep-chart";
import { TimeEntry, SleepMetrics } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export default function Home() {
  // Track the currently selected date
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  });
  
  // Fetch entries for the selected date
  const { 
    data: entries = [], 
    isLoading: isLoadingEntries,
    refetch: refetchEntries 
  } = useQuery<TimeEntry[]>({ 
    queryKey: ['/api/entries', selectedDate],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`/api/entries?date=${queryKey[1]}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      return res.json();
    }
  });

  // Fetch metrics for the selected date
  const { 
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics
  } = useQuery<{ 
    totalSleepMinutes: number; 
    totalAwakeMinutes: number; 
    nightSleepMinutes: number;
    date: string;
    sleepCompletionPercentage?: number;
    requiredSleepMinutes?: number;
    timeToNextScheduledSleep?: {
      minutes: number;
      type: 'nap' | 'bedtime';
    };
  }>({ 
    queryKey: ['/api/metrics', selectedDate],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`/api/metrics?date=${queryKey[1]}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    }
  });

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Явно оновлюємо дані при зміні дати
    setTimeout(() => {
      refetchEntries();
      refetchMetrics();
    }, 0);
  };

  // Format metrics data
  const metrics: SleepMetrics = {
    totalSleep: isLoadingMetrics ? "..." : formatDuration(metricsData?.totalSleepMinutes || 0),
    totalAwake: isLoadingMetrics ? "..." : formatDuration(metricsData?.totalAwakeMinutes || 0),
    nightSleep: isLoadingMetrics ? "..." : formatDuration(metricsData?.nightSleepMinutes || 0),
    date: metricsData?.date || selectedDate,
    sleepCompletionPercentage: metricsData?.sleepCompletionPercentage,
    requiredSleepMinutes: metricsData?.requiredSleepMinutes,
    timeToNextScheduledSleep: metricsData?.timeToNextScheduledSleep
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-center mb-2">Трекер Сну Макса</h1>
        <p className="text-slate-600 text-center">Відстежуйте та аналізуйте режим сну вашої дитини</p>
      </header>

      <div className="mb-6">
        <DateSelector 
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>

      <SummaryCards metrics={metrics} />
      <TimeEntryForm entries={entries} selectedDate={selectedDate} />
      <TimelineDisplay entries={entries} selectedDate={selectedDate} />
      
      {/* Графік місячних показників сну */}
      <div className="mt-8">
        <MonthlySleepChart />
      </div>
      
      <div className="mt-8">
        <SleepSettingsForm />
      </div>
      
      <HelpCard />
    </div>
  );
}
