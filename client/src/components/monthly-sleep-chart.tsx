import { useState, useEffect } from "react";
import { addMonths, format, parseISO, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { uk } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Типи даних для API
interface MonthlyMetricsData {
  day: string; // День місяця у форматі YYYY-MM-DD
  totalSleepMinutes: number;
  totalAwakeMinutes: number;
  nightSleepMinutes: number;
}

// Підготовлені дані для графіка
interface ChartData {
  date: string; // День для відображення на осі X (наприклад, "1", "2", "3"...)
  fullDate: string; // Повна дата у форматі YYYY-MM-DD
  totalSleep: number; // Загальний час сну в годинах
  totalAwake: number; // Загальний час бадьорості в годинах
  nightSleep: number; // Нічний сон в годинах
}

export function MonthlySleepChart() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Завантаження даних при зміні місяця
  useEffect(() => {
    async function fetchMonthlyData() {
      setIsLoading(true);
      try {
        const monthString = format(selectedMonth, "yyyy-MM");
        const response = await apiRequest("GET", `/api/metrics/monthly?month=${monthString}`);
        const monthlyData: MonthlyMetricsData[] = await response.json();
        
        // Перетворюємо дані для графіка
        const formattedData: ChartData[] = monthlyData.map(dayData => {
          const date = parseISO(dayData.day);
          return {
            date: format(date, "d"), // День місяця (1-31)
            fullDate: dayData.day, // Повна дата для tooltips
            totalSleep: +(dayData.totalSleepMinutes / 60).toFixed(1), // Конвертуємо в години
            totalAwake: +(dayData.totalAwakeMinutes / 60).toFixed(1), // Конвертуємо в години
            nightSleep: +(dayData.nightSleepMinutes / 60).toFixed(1), // Конвертуємо в години
          };
        });
        
        // Сортуємо за днем
        formattedData.sort((a, b) => parseInt(a.date) - parseInt(b.date));
        
        setChartData(formattedData);
      } catch (error) {
        console.error("Помилка завантаження даних:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMonthlyData();
  }, [selectedMonth]);
  
  // Перехід до попереднього місяця
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => addMonths(prev, -1));
  };
  
  // Перехід до наступного місяця
  const goToNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };
  
  // Перехід до поточного місяця
  const goToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };
  
  // Форматуємо підказку при наведенні
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = payload[0].payload;
      const date = parseISO(dayData.fullDate);
      const formattedDate = format(date, "d MMMM yyyy", { locale: uk });
      
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-semibold">{formattedDate}</p>
          <p className="text-sm">
            <span className="inline-block w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: "#8884d8" }}></span>
            Загальний сон: {formatDuration(dayData.totalSleep * 60)}
          </p>
          <p className="text-sm">
            <span className="inline-block w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: "#82ca9d" }}></span>
            Час бадьорості: {formatDuration(dayData.totalAwake * 60)}
          </p>
          <p className="text-sm">
            <span className="inline-block w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: "#ffc658" }}></span>
            Нічний сон: {formatDuration(dayData.nightSleep * 60)}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Динаміка сну за місяць</CardTitle>
            <CardDescription>
              Графік показує динаміку сну і бадьорості за {format(selectedMonth, "MMMM yyyy", { locale: uk })}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
              Поточний
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  label={{ 
                    value: 'День місяця', 
                    position: 'insideBottomRight', 
                    offset: -5 
                  }} 
                />
                <YAxis 
                  label={{ 
                    value: 'Години', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalSleep" 
                  name="Загальний сон за день" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="totalAwake" 
                  name="Час бадьорості" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="nightSleep" 
                  name="Нічний сон" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64 text-muted-foreground">
            Немає даних для відображення за цей місяць
          </div>
        )}
      </CardContent>
    </Card>
  );
}