import { Card, CardContent } from "@/components/ui/card";
import { Moon, Sun, Bed, Percent, AlarmClock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SleepMetrics } from "@/lib/types";
import { formatDuration, formatDurationGrammatical } from "@/lib/utils";
import { parseSleepDuration, calculateRemainingTime, calculateExcessTime } from "@/lib/sleepUtils";

interface SummaryCardsProps {
  metrics: SleepMetrics;
}

export function SummaryCards({ metrics }: SummaryCardsProps) {
  // Calculate today's date for comparison
  const today = new Date().toISOString().split('T')[0];
  const isToday = metrics.date === today;
  
  // Grid columns depend on whether we show the next sleep timer
  const gridCols = isToday && metrics.timeToNextScheduledSleep 
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" 
    : "grid-cols-1 md:grid-cols-3";
  
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
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Від необхідного</span>
                <span className="font-semibold flex items-center">
                  <Percent className="h-3 w-3 mr-1" />
                  {metrics.sleepCompletionPercentage}%
                </span>
              </div>
              <Progress 
                value={metrics.sleepCompletionPercentage} 
                className={`h-2 ${metrics.sleepCompletionPercentage >= 100 ? "bg-green-500/20" : "bg-[#8b5cf6]/20"}`}
                style={{
                  "--progress-foreground": metrics.sleepCompletionPercentage >= 100 ? "rgb(34 197 94)" : "#8b5cf6"
                } as React.CSSProperties}
              />
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
          )}
        </CardContent>
      </Card>

      {/* Total Awake Card */}
      <Card className="border-l-4 border-[#f97316]">
        <CardContent className="pt-4">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Час бадьорості</h2>
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4 text-[#f97316]" />
            <span className="text-xl font-semibold">{metrics.totalAwake}</span>
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
