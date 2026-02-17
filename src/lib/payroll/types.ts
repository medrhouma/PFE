/**
 * Payroll Engine - Type Definitions
 * 
 * Central type definitions for the entire HR calculation engine.
 * All types are strict, no `any` allowed.
 */

// ─── Session Types ───────────────────────────────────────────

export type SessionType = 'MORNING' | 'AFTERNOON';

export type AttendanceStatus =
  | 'ABSENT'
  | 'PARTIAL'
  | 'FULL'
  | 'REWARD'
  | 'LEAVE_HALF'
  | 'LEAVE_FULL';

// ─── Attendance ──────────────────────────────────────────────

export interface AttendanceSessionRecord {
  id: string;
  userId: string;
  date: Date;
  sessionType: SessionType;
  checkIn: Date | null;
  checkOut: Date | null;
  durationMinutes: number | null;
  status: AttendanceStatus;
  anomalyDetected: boolean | null;
  anomalyReason: string | null;
}

export interface DayAttendanceSummary {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  morning: AttendanceSessionRecord | null;
  afternoon: AttendanceSessionRecord | null;
  dayStatus: DayStatus;
  workedMinutes: number;
  expectedMinutes: number;
  isWorkDay: boolean;
}

export type DayStatus =
  | 'FULL_DAY'         // Both sessions complete
  | 'HALF_DAY_AM'      // Only morning worked
  | 'HALF_DAY_PM'      // Only afternoon worked
  | 'ABSENT'           // No attendance
  | 'LEAVE_FULL'       // Full day leave
  | 'LEAVE_HALF_AM'    // Leave morning, worked afternoon
  | 'LEAVE_HALF_PM'    // Worked morning, leave afternoon
  | 'REWARD'           // Reward day
  | 'WEEKEND'          // Non-work day
  | 'HOLIDAY';         // Public holiday

// ─── Leave ───────────────────────────────────────────────────

export type LeaveType = 'PAID' | 'UNPAID' | 'MATERNITE' | 'MALADIE' | 'PREAVIS' | 'REWARD';

export type LeaveStatus = 'EN_ATTENTE' | 'VALIDE' | 'REFUSE';

export interface LeaveRecord {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDaySession: SessionType | null;
  status: LeaveStatus;
  impactOnSalary: boolean;
  durationDays: number;
}

export interface LeaveSummary {
  paidDays: number;
  unpaidDays: number;
  sickDays: number;
  maternityDays: number;
  otherDays: number;
  totalDays: number;
  salaryDeductionDays: number; // Only unpaid leaves affect salary
}

// ─── Rewards ─────────────────────────────────────────────────

export interface RewardRecord {
  id: string;
  userId: string;
  date: Date;
  reason: string;
  grantedById: string;
  salaryImpact: number;
  status: 'APPROVED' | 'REVOKED';
}

export interface RewardSummary {
  totalDays: number;
  totalBonus: number;
  records: RewardRecord[];
}

// ─── Contract / Employment ──────────────────────────────────

export type ContractType = 'CDI' | 'CDD' | 'Stage' | 'Freelance';

export interface EmploymentTerms {
  employeeId: string;
  employeRecordId: string;
  name: string;
  baseSalary: number;
  hourlyRate: number;
  contractType: ContractType;
  annualLeaveAllowance: number;
  dateEmbauche: Date | null;
}

// ─── Salary Calculation ─────────────────────────────────────

export interface AttendanceCalculation {
  totalWorkedDays: number;
  totalWorkedHours: number;
  totalWorkedMinutes: number;
  expectedWorkDays: number;
  expectedWorkHours: number;
  absentDays: number;
  absentHours: number;
  partialDays: number;
  fullDays: number;
  overtimeHours: number;
  dailySummaries: DayAttendanceSummary[];
}

export interface SalaryBreakdown {
  baseSalary: number;
  dailyRate: number;
  hourlyRate: number;
  
  // Earnings
  workedDaysPay: number;
  overtimePay: number;
  rewardBonus: number;
  
  // Deductions
  absenceDeduction: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  
  // Leaves (informational — paid leaves don't deduct)
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  otherLeaveDays: number;
  
  // Rewards
  rewardDays: number;
  
  // Totals
  grossSalary: number;
  netSalary: number;
}

export interface MonthlySalaryResult {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  contractType: ContractType;
  
  attendance: AttendanceCalculation;
  leaves: LeaveSummary;
  rewards: RewardSummary;
  salary: SalaryBreakdown;
  
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

// ─── Analytics ──────────────────────────────────────────────

export interface MonthlyAttendanceAnalytics {
  month: number;
  year: number;
  totalEmployees: number;
  averageAttendanceRate: number;
  totalAbsentDays: number;
  totalLateDays: number;
  totalOvertimeHours: number;
  employeeBreakdown: Array<{
    employeeId: string;
    employeeName: string;
    attendanceRate: number;
    workedDays: number;
    absentDays: number;
  }>;
}

export interface LeaveAnalytics {
  month: number;
  year: number;
  totalLeaveRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  byType: Record<LeaveType, number>;
  averageDuration: number;
}

export interface PayrollAnalytics {
  month: number;
  year: number;
  totalPayroll: number;
  averageSalary: number;
  totalDeductions: number;
  totalOvertime: number;
  totalRewardBonuses: number;
  employeeCount: number;
}

// ─── Check-in/out Request ────────────────────────────────────

export interface SessionCheckRequest {
  userId: string;
  sessionType: SessionType;
  photo?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface SessionCheckResponse {
  success: boolean;
  session: AttendanceSessionRecord;
  message: string;
  anomaly?: {
    detected: boolean;
    reason: string;
  };
}

// ─── Leave Balance ──────────────────────────────────────────

export interface LeaveBalance {
  annualAllowance: number;
  used: number;
  pending: number;
  remaining: number;
  byType: Record<LeaveType, number>;
}
