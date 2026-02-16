/**
 * Date Utilities
 * Helper functions for date manipulation and formatting
 */

import { format, formatDistanceToNow, parseISO, isValid, differenceInDays, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "-";
  return format(d, formatStr, { locale: fr });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

/**
 * Format a time only
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, "HH:mm");
}

/**
 * Get relative time string (e.g., "il y a 5 minutes")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "-";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

/**
 * Format a date range
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;
  
  if (!isValid(startDate) || !isValid(endDate)) return "-";
  
  if (isSameDay(startDate, endDate)) {
    return formatDate(startDate, "dd MMMM yyyy");
  }
  
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, "dd", { locale: fr })} - ${format(endDate, "dd MMMM yyyy", { locale: fr })}`;
  }
  
  return `${format(startDate, "dd MMM", { locale: fr })} - ${format(endDate, "dd MMM yyyy", { locale: fr })}`;
}

/**
 * Calculate duration between two dates/times
 */
export function calculateDuration(start: Date | string, end: Date | string): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;
  
  if (!isValid(startDate) || !isValid(endDate)) {
    return { hours: 0, minutes: 0, formatted: "-" };
  }
  
  const totalMinutes = differenceInMinutes(endDate, startDate);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    hours,
    minutes,
    formatted: `${hours}h${minutes.toString().padStart(2, "0")}`,
  };
}

/**
 * Get number of working days between two dates
 */
export function getWorkingDays(start: Date | string, end: Date | string): number {
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;
  
  if (!isValid(startDate) || !isValid(endDate)) return 0;
  
  let workingDays = 0;
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return workingDays;
}

/**
 * Get month boundaries
 */
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const date = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Get week boundaries
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(date: Date | string, start: Date, end: Date): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return false;
  return isWithinInterval(d, { start, end });
}

/**
 * Get days remaining until a date
 */
export function getDaysRemaining(targetDate: Date | string): number {
  const target = typeof targetDate === "string" ? parseISO(targetDate) : targetDate;
  if (!isValid(target)) return 0;
  return differenceInDays(target, new Date());
}

/**
 * Format month name
 */
export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1);
  return format(date, "MMMM", { locale: fr });
}

/**
 * Get array of months for select dropdown
 */
export function getMonthOptions(): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));
}

/**
 * Get array of years for select dropdown
 */
export function getYearOptions(startYear: number = 2020, endYear: number = new Date().getFullYear()): number[] {
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);
}

/**
 * Parse time string to Date object
 */
export function parseTimeString(timeStr: string, baseDate: Date = new Date()): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  
  const [, hours, minutes, seconds = "0"] = match;
  const date = new Date(baseDate);
  date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
  
  return date;
}

/**
 * Check if it's currently working hours
 */
export function isWorkingHours(
  startHour: number = 9,
  endHour: number = 18
): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay();
  
  // Not working on weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get greeting based on time of day
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}
