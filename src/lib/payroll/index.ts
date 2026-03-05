/**
 * Payroll Engine - Public API
 * 
 * Import everything from here:
 *   import { calculateMonthlySalary, calculateAllSalaries } from '@/lib/payroll';
 */

// Core engine
export {
  calculateMonthlySalary,
  calculateAllSalaries,
  estimateSalary,
} from './engine';

// Individual calculators (for advanced usage)
export { calculateAttendance } from './attendance-calculator';
export { calculateLeaveImpact } from './leave-calculator';
export { computeSalary } from './salary-calculator';

// Constants & utilities
export {
  STANDARD_HOURS_PER_DAY,
  STANDARD_HOURS_PER_MONTH,
  STANDARD_WORK_DAYS_PER_MONTH,
  MORNING_SESSION_HOURS,
  AFTERNOON_SESSION_HOURS,
  OVERTIME_MULTIPLIER,
  DEFAULT_ANNUAL_LEAVE_DAYS,
  LATE_TOLERANCE_MINUTES,
  EARLY_DEPARTURE_TOLERANCE_MINUTES,
  MORNING_START_TIME,
  MORNING_END_TIME,
  AFTERNOON_START_TIME,
  AFTERNOON_END_TIME,
  isWeekend,
  isPublicHoliday,
  isWorkDay,
  countWorkDaysInMonth,
  getWorkDatesInMonth,
  calculateDailyRate,
  calculateHourlyRate,
  calculateLateMinutes,
  calculateEarlyDepartureMinutes,
  toDateString,
} from './constants';

// Types
export type {
  MonthlySalaryResult,
  SalaryBreakdown,
  AttendanceCalculation,
  DayAttendanceSummary,
  AttendanceSessionRecord,
  AttendanceStatus,
  SessionType,
  DayStatus,
  LeaveRecord,
  LeaveSummary,
  LeaveBalance,
  RewardRecord,
  RewardSummary,
  EmploymentTerms,
  ContractType,
  SessionCheckRequest,
  SessionCheckResponse,
  MonthlyAttendanceAnalytics,
  LeaveAnalytics,
  PayrollAnalytics,
} from './types';
