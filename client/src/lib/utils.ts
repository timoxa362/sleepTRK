import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { uk } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert time string to minutes for calculations
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format minutes as hours and minutes string
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}год. ${mins}хв.`;
}

// Format minutes with grammatically correct Ukrainian words for hours and minutes
export function formatDurationGrammatical(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // Ukrainian grammar rules for numbers
  const hoursWord = getUkrainianHoursForm(hours);
  const minutesWord = getUkrainianMinutesForm(mins);
  
  if (hours > 0 && mins > 0) {
    return `${hours} ${hoursWord} ${mins} ${minutesWord}`;
  } else if (hours > 0) {
    return `${hours} ${hoursWord}`;
  } else {
    return `${mins} ${minutesWord}`;
  }
}

// Helper function to get grammatically correct form for hours in Ukrainian
function getUkrainianHoursForm(hours: number): string {
  const lastDigit = hours % 10;
  const lastTwoDigits = hours % 100;
  
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return 'година';
  } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return 'години';
  } else {
    return 'годин';
  }
}

// Helper function to get grammatically correct form for minutes in Ukrainian
function getUkrainianMinutesForm(minutes: number): string {
  const lastDigit = minutes % 10;
  const lastTwoDigits = minutes % 100;
  
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return 'хвилина';
  } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return 'хвилини';
  } else {
    return 'хвилин';
  }
}

// Format time for display (keep 24-hour format)
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  
  // Just return the original 24-hour time format
  return `${timeStr}`;
}

// Get current time in HH:MM format
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Format ISO date string with Ukrainian locale
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  return format(parseISO(dateString), 'PPP', { locale: uk });
}
