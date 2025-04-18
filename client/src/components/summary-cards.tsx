import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Moon, Sun, Bed, Percent, AlarmClock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SleepMetrics } from "@/lib/types";
import { formatDuration, formatDurationGrammatical, timeToMinutes, calculateDuration } from "@/lib/utils";
import { parseSleepDuration, calculateRemainingTime, calculateExcessTime } from "@/lib/sleepUtils";

interface TimeEntry {
  type: 'fell-asleep' | 'woke-up';
  time: string;
}

interface SummaryCardsProps {
  metrics: SleepMetrics;
  entries: TimeEntry[];
}

export function SummaryCards({ metrics, entries }: SummaryCardsProps) {
  // Calculate today's date for comparison
  const today = new Date().toISOString().split('T')[0];
  const isToday = metrics.date === today;
  const currentHour = new Date().getHours();

  // --- State for dynamic wakefulness duration ---
  const [currentWakeDurationStr, setCurrentWakeDurationStr] = useState<string | null>(null);

  // Grid columns depend on whether we show the next sleep timer
  const gridCols = isToday && metrics.timeToNextScheduledSleep 
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" 
    : "grid-cols-1 md:grid-cols-3";
  // --- Calculate predicted night bedtime ---
  let predictedNightBedtimeStr: string | null = null;
  if (isToday && currentHour >= 17 && entries.length > 0 && currentHour <= 20) {
    try {
      const lastWakeUpEntry = entries.slice().reverse().find(entry => entry.type === 'woke-up');

      // Check if all necessary metrics and the last wake-up entry exist
      if (lastWakeUpEntry && metrics.totalSleep && metrics.totalAwake && metrics.nightSleep !== undefined) { // Check nightSleep specifically
        const lastWakeUpTime = lastWakeUpEntry.time;
        const lastWakeUpMinutes = timeToMinutes(lastWakeUpTime);

        // --- Apply the user's specified calculation ---
        // Assuming metrics.totalSleep = Naps only
        const totalNapMinutes = parseSleepDuration(metrics.totalSleep);
        const totalAwakeMinutes = parseSleepDuration(metrics.totalAwake);
        // Handle nightSleep potentially being "0год. 0хв." or similar -> parse to 0
        const nightSleepMinutes = metrics.nightSleep ? parseSleepDuration(metrics.nightSleep) : 0;
        const totalDayMinutes = 24 * 60; // 1440

        // Calculate time *not yet accounted for* using the formula:
        // 24h - Naps - Awake - Night Sleep
        const unaccountedMinutesCalc = totalDayMinutes - totalNapMinutes - totalAwakeMinutes - nightSleepMinutes;

        // Ensure the duration added is not negative.
        const unaccountedMinutes = Math.max(0, unaccountedMinutesCalc);
        // --- End of user's specified calculation ---

        // Add unaccounted time to the last wake-up time
        const predictedBedtimeMinutes = lastWakeUpMinutes + unaccountedMinutes;

        // Convert the predicted total minutes back to HH:MM format
        const predictedTime = formatDuration(predictedBedtimeMinutes);

        predictedNightBedtimeStr = `${predictedTime}`;

      } else if (!lastWakeUpEntry) {
        // Handle case where there's no wake-up entry yet today
        predictedNightBedtimeStr = "Немає даних для прогнозу";
      } else {
        // Handle cases where some metrics might be missing (e.g., nightSleep is null/undefined initially)
        predictedNightBedtimeStr = "Недостатньо даних для прогнозу";
      }

    } catch (error) {
      console.error("Error calculating predicted night bedtime:", error);
      // Consider more specific error messages based on parsing failures if needed
      predictedNightBedtimeStr = "Помилка прогнозу";
    }
  }
  // --- End calculation ---

  // --- Effect to calculate and update current wakefulness duration ---
  useEffect(() => {
    // ***** FIX: Use 'number' instead of 'NodeJS.Timeout' *****
    let intervalId: number | null = null;
    // **********************************************************

    const calculateCurrentWakefulness = () => {
      if (entries.length > 0 && isToday) {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.type === 'woke-up') {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const lastWakeUpMinutes = timeToMinutes(lastEntry.time);
          let durationMinutes = currentMinutes - lastWakeUpMinutes;
          if (durationMinutes < 0) { // Handle midnight crossing
            durationMinutes = (24 * 60 - lastWakeUpMinutes) + currentMinutes;
          }
          if (durationMinutes >= 0) {
            setCurrentWakeDurationStr(formatDurationGrammatical(durationMinutes));
            return true; // Timer needed
          }
        }
      }
      // Reset if conditions not met
      setCurrentWakeDurationStr(null);
      return false; // Timer not needed
    };

    const needsTimer = calculateCurrentWakefulness(); // Initial calculation

    if (needsTimer) {
      // window.setInterval returns a number in browsers
      intervalId = window.setInterval(calculateCurrentWakefulness, 60000); // Use window.setInterval explicitly if needed
    }

    // Cleanup function (clearInterval works with the number ID)
    return () => {
      if (intervalId !== null) { // Check for null before clearing
        clearInterval(intervalId);
      }
    };
  }, [entries, isToday]); // Dependencies
  // --- End effect ---

  return (
    <div className={`grid ${gridCols} gap-4 mb-8`}>
      {/* Total Sleep Card */}
      <Card className="border-l-4 border-[#8b5cf6]">
        <CardContent className="pt-4">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Загальний сон за день</h2>
          <div className="flex items-center space-x-2">
            <Moon className="h-4 w-4 text-[#8b5cf6]" />
            <span className="text-xl font-semibold">{metrics.totalSleep}</span>
          </div>

          {/* Sleep Completion Progress */}
          {metrics.sleepCompletionPercentage !== undefined && metrics.requiredSleepMinutes && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>Від необхідного</span>
                <span className="font-semibold flex items-center">
                  {metrics.sleepCompletionPercentage}
                  <Percent className="h-3 w-3 mr-1" />
                </span>
              </div>
              <div className="border-b border-gray-600 border-dashed mb-5"></div>
              <div className="relative mb-0 md:mb-0">
                <div className="relative">
                  <Progress 
                    value={metrics.sleepCompletionPercentage} 
                    className={`h-2 ${metrics.sleepCompletionPercentage >= 100 ? "bg-green-500/20" : "bg-[#8b5cf6]/20"}`}
                    style={{
                      "--progress-foreground": metrics.sleepCompletionPercentage >= 100 ? "rgb(34 197 94)" : "#8b5cf6"
                    } as React.CSSProperties}
                  />
                </div>
                {/* Sleep duration markers */}
                <div className="w-full flex justify-start items-end z-11 mt-6 md:mt-7 mb-2">
                  {entries.reduce((markers, entry, index, array) => {
                    if (entry.type === 'fell-asleep' && index < array.length - 1 && array[index + 1].type === 'woke-up') {
                      const startTime = entry.time;
                      const endTime = array[index + 1].time;
                      const duration = calculateDuration(startTime, endTime);
                      const position = (index / (array.length - 2)) * 100;

                      markers.push(
                        <div 
                          key={index} 
                          className="absolute flex flex-col items-center min-w-[40px] md:min-w-[60px]"
                          style={{ 
                            left: `${position}%`,
                            transform: 'translateX(-50%)'
                          }}
                        >
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#f97316] text-white text-xs font-medium my-1">
                            {Math.floor(index / 2) + 1}
                          </div>
                          <span className="text-[10px] md:text-xs text-muted-foreground text-center break-words md:whitespace-nowrap">{`${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`}</span>
                        </div>
                      );
                    }
                    return markers;
                  }, [] as React.ReactNode[])}
                </div>
                <div className="border-t border-gray-600 border-dashed mt-1 mb-2 mt-2"></div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">                
                  <span>Ціль: {formatDuration(metrics.requiredSleepMinutes)}</span>
                  {metrics.sleepCompletionPercentage < 100 && (
                    <span className="font-medium text-[#8b5cf6]">
                      Залишилось: {formatDurationGrammatical(calculateRemainingTime(parseSleepDuration(metrics.totalSleep), metrics.requiredSleepMinutes))}
                    </span>
                  )}
                  {metrics.sleepCompletionPercentage >= 100 && (
                    <span className="font-medium text-green-500">
                      Перевиконано: {formatDurationGrammatical(calculateExcessTime(parseSleepDuration(metrics.totalSleep), metrics.requiredSleepMinutes))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Awake Card */}
      <Card className="border-l-4 border-[#f97316]">
        <CardContent className="pt-4 pb-16">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Час бадьорості</h2>
          <div className="flex items-center space-x-2 mb-4">
            <Sun className="h-4 w-4 text-[#f97316]" />
            <span className="text-xl font-semibold">{metrics.totalAwake}</span>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            {currentWakeDurationStr && (
              <p className="text-sm -mt-2 mb-4"> {/* Keep base styles like text-sm and margins */}
                {/* Span for the label: gray, normal weight */}
                <span className="text-muted-foreground font-normal"> {/* Use text-muted-foreground for standard gray */}
                  Тривалість бадьорості зараз:
                </span>
                {/* Span for the value: orange, medium weight, add a small space */}
                <span className="text-orange-600 font-medium ml-1"> {/* Keep original orange/medium, add margin-left */}
                  {currentWakeDurationStr}
                </span>
              </p>
            )}
          </div>
          
          {/* Awake time markers */}
          <div className="mt-4">
            <div className="relative mb-2 translate-y-[40px]">
              <div className="w-full flex justify-start items-end">
                {entries.reduce((markers, entry, index, array) => {
                  if (entry.type === 'woke-up' && index < array.length - 1 && array[index + 1].type === 'fell-asleep') {
                    const startTime = entry.time;
                    const endTime = array[index + 1].time;
                    const duration = calculateDuration(startTime, endTime);
                    const position = (index / (array.length - 2)) * 100;
                    
                    markers.push(
                      <div 
                        key={index} 
                        className="absolute flex flex-col items-center"
                        style={{ 
                          left: `${position}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <div className="w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center text-white text-xs">
                          😊
                        </div>
                        <span className="text-[10px] md:text-xs text-muted-foreground mt-2 whitespace-nowrap">
                          {`${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`}
                        </span>
                      </div>
                    );
                  }
                  return markers;
                }, [] as React.ReactNode[])}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Night Sleep Card */}
      <Card className="border-l-4 border-blue-500">
        <CardContent className="pt-4">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Тривалість нічного сну</h2>
          <div className="flex items-center space-x-2">
            <Bed className="h-4 w-4 text-blue-500" />
            <span className="text-xl font-semibold">{metrics.nightSleep}</span>
          </div>
          <div className="flex items-center space-x-2">                    
          {predictedNightBedtimeStr  && (
             // Using the label reflecting the calculation (unaccounted time)
            <p className="text-xs text-muted-foreground mb-3">Нічний сон о: <span class="font-bold text-purple-500">{predictedNightBedtimeStr }</span></p>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Next Sleep Timer Card - Only show for today's date */}
      {isToday && metrics.timeToNextScheduledSleep && (
        <Card className="border-l-4 border-amber-500">
          <CardContent className="pt-4">
            <h2 className="text-sm font-medium text-slate-500 mb-1">
              {metrics.timeToNextScheduledSleep.type === 'nap' 
                ? 'Час до денного сну' 
                : 'Час до нічного сну'}
            </h2>
            <div className="flex items-center space-x-2">
              <AlarmClock className="h-4 w-4 text-amber-500" />
              <span className="text-xl font-semibold">
                {formatDurationGrammatical(metrics.timeToNextScheduledSleep.minutes)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}