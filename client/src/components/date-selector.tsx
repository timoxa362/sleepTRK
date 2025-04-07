import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  // Форматування вибраної дати для відображення
  const formattedDate = formatDate(selectedDate);
  
  // Стан для дати календаря
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : undefined
  );

  // Синхронізуємо calendarDate з selectedDate при зміні selectedDate ззовні
  useEffect(() => {
    if (selectedDate) {
      setCalendarDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Стан для контролю відкриття/закриття календаря
  const [open, setOpen] = useState(false);
  
  // Обробка зміни дати в календарі
  const handleCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) {
      // Створюємо нову дату з правильним зсувом часових поясів
      // Це вирішує проблему зсуву дати на 1 день
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const adjusted = new Date(year, month, day, 12, 0, 0);
      const dateString = adjusted.toISOString().split('T')[0];
      
      setCalendarDate(adjusted);
      onDateChange(dateString);
      // Закриваємо попоовер після вибору дати
      setOpen(false);
    }
  }, [onDateChange]);

  // Перейти до попереднього дня
  const goToPreviousDay = () => {
    if (calendarDate) {
      const prevDate = new Date(calendarDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const dateString = prevDate.toISOString().split('T')[0];
      setCalendarDate(prevDate);
      onDateChange(dateString);
    }
  };

  // Перейти до наступного дня
  const goToNextDay = () => {
    if (calendarDate) {
      const nextDate = new Date(calendarDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const dateString = nextDate.toISOString().split('T')[0];
      setCalendarDate(nextDate);
      onDateChange(dateString);
    }
  };

  // Перейти до сьогоднішнього дня
  const goToToday = useCallback(() => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    setCalendarDate(today);
    onDateChange(dateString);
    // Закриваємо поповер після вибору сьогоднішнього дня
    setOpen(false);
  }, [onDateChange]);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between mb-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goToPreviousDay}
          aria-label="Попередній день"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 text-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={handleCalendarSelect}
                defaultMonth={calendarDate}
                initialFocus
              />
              <div className="p-3 border-t">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={goToToday}
                >
                  Сьогодні
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goToNextDay}
          aria-label="Наступний день"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}