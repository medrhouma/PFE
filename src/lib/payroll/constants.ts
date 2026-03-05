/**
 * Payroll Engine - Business Constants
 * 
 * All magic numbers are defined here.
 * Tunisian labor law defaults with configurable overrides.
 */

// ─── Work Schedule ──────────────────────────────────────────

/** Standard work hours per day (7h: 09:00-12:00 + 13:00-17:00) */
export const STANDARD_HOURS_PER_DAY = 7;

/** Morning session duration in hours (3h: 09:00 - 12:00) */
export const MORNING_SESSION_HOURS = 3;

/** Afternoon session duration in hours (4h: 13:00 - 17:00) */
export const AFTERNOON_SESSION_HOURS = 4;

/** Morning session start hour */
export const MORNING_START_HOUR = 9;

/** Morning session end hour */
export const MORNING_END_HOUR = 12;

/** Afternoon session start hour */
export const AFTERNOON_START_HOUR = 13;

/** Afternoon session end hour */
export const AFTERNOON_END_HOUR = 17;

/** Standard work days per week (Mon-Fri, Sat half or off) */
export const STANDARD_WORK_DAYS_PER_WEEK = 5;

/** Standard work hours per week */
export const STANDARD_HOURS_PER_WEEK = STANDARD_HOURS_PER_DAY * STANDARD_WORK_DAYS_PER_WEEK;

/** Standard work days per month (approximate) */
export const STANDARD_WORK_DAYS_PER_MONTH = 22;

/** Standard work hours per month */
export const STANDARD_HOURS_PER_MONTH = STANDARD_WORK_DAYS_PER_MONTH * STANDARD_HOURS_PER_DAY;

// ─── Time Constraints ───────────────────────────────────────

/** Minimum delay between clicks in milliseconds (30 seconds) */
export const MIN_CLICK_DELAY_MS = 30_000;

/** Minimum session duration to count as PARTIAL (15 minutes) */
export const MIN_SESSION_MINUTES = 15;

/** Minimum session duration to count as FULL (2h15 = 75% of a 3h morning session) */
export const FULL_SESSION_THRESHOLD_MINUTES = 135;

/** Maximum allowed overtime hours per month */
export const MAX_OVERTIME_HOURS_PER_MONTH = 40;

// ─── Tolerance / Late Tracking ──────────────────────────────

/** Grace period in minutes before marking as late (e.g., arrive at 9:10 is OK) */
export const LATE_TOLERANCE_MINUTES = 10;

/** Grace period in minutes for early departure */
export const EARLY_DEPARTURE_TOLERANCE_MINUTES = 10;

/** Morning session official start time (HH:MM) */
export const MORNING_START_TIME = { hour: 9, minute: 0 };

/** Morning session official end time (HH:MM) */
export const MORNING_END_TIME = { hour: 12, minute: 0 };

/** Afternoon session official start time (HH:MM) */
export const AFTERNOON_START_TIME = { hour: 13, minute: 0 };

/** Afternoon session official end time (HH:MM) */
export const AFTERNOON_END_TIME = { hour: 17, minute: 0 };

/** Earliest allowed check-in hour */
export const EARLIEST_CHECKIN_HOUR = 6;

/** Latest allowed check-out hour */
export const LATEST_CHECKOUT_HOUR = 22;

// ─── Salary Calculation ─────────────────────────────────────

/** Overtime multiplier (1.5x base rate) */
export const OVERTIME_MULTIPLIER = 1.5;

/** Weekend/holiday overtime multiplier (2x base rate) */
export const WEEKEND_OVERTIME_MULTIPLIER = 2.0;

/** Default annual leave days (Tunisian law: 1 day per month = ~12, many companies give 26) */
export const DEFAULT_ANNUAL_LEAVE_DAYS = 26;

/** Months in a year (for salary proration) */
export const MONTHS_IN_YEAR = 12;

// ─── Leave Types Impact ─────────────────────────────────────

/** Leave types that are paid (no salary deduction) */
export const PAID_LEAVE_TYPES = ['PAID', 'MATERNITE', 'MALADIE', 'REWARD'] as const;

/** Leave types that deduct from salary */
export const UNPAID_LEAVE_TYPES = ['UNPAID'] as const;

/** Leave types that count toward annual allowance */
export const ANNUAL_LEAVE_TYPES = ['PAID'] as const;

// ─── Weekends & Holidays ────────────────────────────────────

/** Weekend days (0 = Sunday, 6 = Saturday) */
export const WEEKEND_DAYS = [0, 6] as const; // Sunday and Saturday

/**
 * Tunisian public holidays (month, day) — static list
 * These don't change year to year for fixed holidays.
 * Islamic holidays are variable and should be configured per year.
 */
export const PUBLIC_HOLIDAYS_FIXED: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "Nouvel An" },
  { month: 1, day: 14, name: "Fête de la Révolution" },
  { month: 3, day: 20, name: "Fête de l'Indépendance" },
  { month: 4, day: 9, name: "Journée des Martyrs" },
  { month: 5, day: 1, name: "Fête du Travail" },
  { month: 7, day: 25, name: "Fête de la République" },
  { month: 8, day: 13, name: "Fête de la Femme" },
  { month: 10, day: 15, name: "Fête de l'Évacuation" },
];

// ─── Rate Limiting ──────────────────────────────────────────

/** Max attendance actions per minute per user */
export const MAX_ATTENDANCE_ACTIONS_PER_MINUTE = 4;

/** Max salary calculations per hour per user */
export const MAX_SALARY_CALCS_PER_HOUR = 10;

// ─── Utility Functions ──────────────────────────────────────

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getDay() as 0 | 6);
}

/**
 * Check if a date is a fixed public holiday
 */
export function isPublicHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return PUBLIC_HOLIDAYS_FIXED.some(h => h.month === month && h.day === day);
}

/**
 * Check if a date is a work day
 */
export function isWorkDay(date: Date): boolean {
  return !isWeekend(date) && !isPublicHoliday(date);
}

/**
 * Count work days in a month
 */
export function countWorkDaysInMonth(year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of month
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isWorkDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Get all work dates in a month
 */
export function getWorkDatesInMonth(year: number, month: number): Date[] {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    if (isWorkDay(current)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Calculate daily rate from monthly salary
 */
export function calculateDailyRate(monthlySalary: number, workDaysInMonth?: number): number {
  const days = workDaysInMonth ?? STANDARD_WORK_DAYS_PER_MONTH;
  return monthlySalary / days;
}

/**
 * Calculate hourly rate from monthly salary
 */
export function calculateHourlyRate(monthlySalary: number, workDaysInMonth?: number): number {
  const dailyRate = calculateDailyRate(monthlySalary, workDaysInMonth);
  return dailyRate / STANDARD_HOURS_PER_DAY;
}

/**
 * Format date to YYYY-MM-DD string
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get session expected minutes
 */
export function getSessionExpectedMinutes(sessionType: 'MORNING' | 'AFTERNOON'): number {
  return sessionType === 'MORNING'
    ? MORNING_SESSION_HOURS * 60
    : AFTERNOON_SESSION_HOURS * 60;
}

/**
 * Calculate late minutes for a session check-in
 * Returns 0 if within tolerance, or the number of late minutes
 */
export function calculateLateMinutes(checkInTime: Date, sessionType: 'MORNING' | 'AFTERNOON'): number {
  const startTime = sessionType === 'MORNING' ? MORNING_START_TIME : AFTERNOON_START_TIME;
  const expectedStart = new Date(checkInTime);
  expectedStart.setHours(startTime.hour, startTime.minute, 0, 0);
  
  const diffMinutes = Math.round((checkInTime.getTime() - expectedStart.getTime()) / (1000 * 60));
  
  // If arrived before or within tolerance, no late
  if (diffMinutes <= LATE_TOLERANCE_MINUTES) return 0;
  
  return diffMinutes;
}

/**
 * Calculate early departure minutes for a session check-out
 * Returns 0 if left at or after expected time (with tolerance)
 */
export function calculateEarlyDepartureMinutes(checkOutTime: Date, sessionType: 'MORNING' | 'AFTERNOON'): number {
  const endTime = sessionType === 'MORNING' ? MORNING_END_TIME : AFTERNOON_END_TIME;
  const expectedEnd = new Date(checkOutTime);
  expectedEnd.setHours(endTime.hour, endTime.minute, 0, 0);
  
  const diffMinutes = Math.round((expectedEnd.getTime() - checkOutTime.getTime()) / (1000 * 60));
  
  // If left after or within tolerance, no early departure
  if (diffMinutes <= EARLY_DEPARTURE_TOLERANCE_MINUTES) return 0;
  
  return diffMinutes;
}
