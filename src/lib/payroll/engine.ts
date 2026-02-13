/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           SANTEC AI — PAYROLL CALCULATION ENGINE            ║
 * ║                                                              ║
 * ║  Central entry point for all salary computations.            ║
 * ║  Orchestrates: attendance, leaves, rewards → salary.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * Usage:
 *   import { calculateMonthlySalary } from '@/lib/payroll/engine';
 *   const result = await calculateMonthlySalary(employeeId, 2026, 2);
 */

import prisma from '@/lib/prisma';
import { calculateAttendance } from './attendance-calculator';
import { calculateLeaveImpact } from './leave-calculator';
import { computeSalary } from './salary-calculator';
import { rewardService } from '@/lib/services/reward-service';
import {
  STANDARD_HOURS_PER_DAY,
  calculateHourlyRate,
  countWorkDaysInMonth,
} from './constants';
import type {
  MonthlySalaryResult,
  EmploymentTerms,
  ContractType,
} from './types';

/**
 * Calculate the monthly salary for an employee.
 * 
 * This is the MAIN function. It:
 * 1. Loads the employee's contract/employment terms
 * 2. Calculates attendance metrics for the month
 * 3. Calculates leave impact
 * 4. Loads reward days
 * 5. Computes the final salary breakdown
 * 
 * @param employeeId - The user ID of the employee
 * @param year       - The year (e.g. 2026)
 * @param month      - The month (1-12)
 * @returns Full salary result with all breakdowns
 */
export async function calculateMonthlySalary(
  employeeId: string,
  year: number,
  month: number
): Promise<MonthlySalaryResult> {
  // ── Step 1: Load employment terms ────────────────────────
  const terms = await loadEmploymentTerms(employeeId);

  // ── Step 2: Calculate attendance ─────────────────────────
  const attendance = await calculateAttendance(employeeId, year, month);

  // ── Step 3: Calculate leave impact ───────────────────────
  const leaves = await calculateLeaveImpact(employeeId, year, month);

  // ── Step 4: Load rewards ─────────────────────────────────
  const rewards = await rewardService.getMonthlySummary(employeeId, year, month);

  // ── Step 5: Compute salary ───────────────────────────────
  const salary = computeSalary(terms, attendance, leaves, rewards, year, month);

  // ── Build result ─────────────────────────────────────────
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  return {
    employeeId,
    employeeName: terms.name,
    month,
    year,
    contractType: terms.contractType,
    attendance,
    leaves,
    rewards,
    salary,
    generatedAt: new Date(),
    periodStart,
    periodEnd,
  };
}

/**
 * Calculate salary for ALL active employees for a month
 */
export async function calculateAllSalaries(
  year: number,
  month: number
): Promise<MonthlySalaryResult[]> {
  const activeEmployees = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: 'USER', // Only regular employees
    },
    select: { id: true },
  });

  const results: MonthlySalaryResult[] = [];

  for (const emp of activeEmployees) {
    try {
      const result = await calculateMonthlySalary(emp.id, year, month);
      results.push(result);
    } catch (error) {
      console.error(`Failed to calculate salary for employee ${emp.id}:`, error);
      // Continue with other employees
    }
  }

  return results;
}

/**
 * Quick salary estimation (lighter than full calculation)
 * Used for dashboard previews
 */
export async function estimateSalary(
  employeeId: string,
  year: number,
  month: number
): Promise<{
  baseSalary: number;
  estimatedNet: number;
  workedDays: number;
  expectedDays: number;
  attendanceRate: number;
}> {
  const terms = await loadEmploymentTerms(employeeId);
  const attendance = await calculateAttendance(employeeId, year, month);
  const expectedDays = countWorkDaysInMonth(year, month);
  const dailyRate = terms.baseSalary / expectedDays;

  const absenceDeduction = attendance.absentDays * dailyRate;
  const estimatedNet = terms.baseSalary - absenceDeduction;
  const attendanceRate = expectedDays > 0
    ? (attendance.totalWorkedDays / expectedDays) * 100
    : 0;

  return {
    baseSalary: terms.baseSalary,
    estimatedNet: Math.round(estimatedNet * 100) / 100,
    workedDays: attendance.totalWorkedDays,
    expectedDays,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
  };
}

// ─── Internal Helpers ────────────────────────────────────────

/**
 * Load employment terms from the database
 */
async function loadEmploymentTerms(userId: string): Promise<EmploymentTerms> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: true,
    },
  });

  if (!user) {
    throw new Error(`Employee not found: ${userId}`);
  }

  const employe = user.employee;
  const baseSalary = employe?.baseSalary ?? 0;
  const contractType = (employe?.typeContrat ?? 'CDI') as ContractType;

  // Calculate hourly rate if not explicitly set
  const hourlyRate = employe?.hourlyRate ?? calculateHourlyRate(baseSalary);

  return {
    employeeId: userId,
    employeRecordId: employe?.id ?? '',
    name: `${user.name || ''} ${user.lastName || ''}`.trim() || user.email,
    baseSalary,
    hourlyRate,
    contractType,
    annualLeaveAllowance: employe?.annualLeave ?? 26,
    dateEmbauche: employe?.dateEmbauche ?? null,
  };
}

// ─── Re-exports for convenience ─────────────────────────────

export type { MonthlySalaryResult, SalaryBreakdown, AttendanceCalculation } from './types';
