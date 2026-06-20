// Pure calculation logic for the payroll engine (Milestone 4 / PRD FR-16-18).
// Deliberately has zero Deno- or Node-specific imports so it can be used
// both by the Deno Edge Function (index.ts) and by Node-based unit tests
// (payroll-logic.test.ts) without duplication.
//
// Known simplifications (documented per PRD §8 open questions):
// - "Weekend/holiday" detection is Saturday-only (no Jewish holiday
//   calendar integration); a shift starting on Saturday has its entire
//   duration paid at weekend_holiday_rate, not just the hours beyond the
//   daily threshold.
// - Each attendance record (one clock-in/out session) is treated as one
//   "day" for the purpose of the daily overtime threshold. An employee who
//   clocks in/out more than once on the same calendar day will have the
//   regular-hours threshold applied per session, not per calendar day.

export interface OvertimePolicy {
  daily_regular_hours: number;
  daily_125_hours: number;
  rate_125: number;
  rate_150: number;
  weekend_holiday_rate: number;
}

export interface ShiftHours {
  regularHours: number;
  overtime125Hours: number;
  overtime150Hours: number;
  weekendHolidayHours: number;
}

const SATURDAY = 6;

/** Splits a single clock-in/out session into regular/125%/150%/weekend hours. */
export function computeShiftHours(
  clockIn: Date,
  clockOut: Date,
  policy: OvertimePolicy,
): ShiftHours {
  const durationHours = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 3_600_000);

  if (clockIn.getDay() === SATURDAY) {
    return {
      regularHours: 0,
      overtime125Hours: 0,
      overtime150Hours: 0,
      weekendHolidayHours: round2(durationHours),
    };
  }

  const regularHours = Math.min(durationHours, policy.daily_regular_hours);
  const remainingAfterRegular = Math.max(0, durationHours - regularHours);
  const overtime125Hours = Math.min(remainingAfterRegular, policy.daily_125_hours);
  const overtime150Hours = Math.max(0, remainingAfterRegular - overtime125Hours);

  return {
    regularHours: round2(regularHours),
    overtime125Hours: round2(overtime125Hours),
    overtime150Hours: round2(overtime150Hours),
    weekendHolidayHours: 0,
  };
}

/** Sums computeShiftHours across every completed attendance session. */
export function aggregateShiftHours(
  sessions: { clockIn: Date; clockOut: Date }[],
  policy: OvertimePolicy,
): ShiftHours {
  return sessions.reduce<ShiftHours>(
    (totals, session) => {
      const hours = computeShiftHours(session.clockIn, session.clockOut, policy);
      return {
        regularHours: round2(totals.regularHours + hours.regularHours),
        overtime125Hours: round2(totals.overtime125Hours + hours.overtime125Hours),
        overtime150Hours: round2(totals.overtime150Hours + hours.overtime150Hours),
        weekendHolidayHours: round2(totals.weekendHolidayHours + hours.weekendHolidayHours),
      };
    },
    { regularHours: 0, overtime125Hours: 0, overtime150Hours: 0, weekendHolidayHours: 0 },
  );
}

export interface SalaryProfileInput {
  pay_type: 'hourly' | 'monthly';
  base_rate: number;
  weekly_hours_baseline: number | null;
  overtime_eligible: boolean;
}

export interface PayrollAmounts {
  grossBase: number;
  grossOvertime: number;
  adjustmentsTotal: number;
  grossTotal: number;
}

/** Derives an hourly-equivalent rate for monthly-salary overtime calculations. */
function monthlyHourlyEquivalent(profile: SalaryProfileInput): number | null {
  if (!profile.weekly_hours_baseline) return null;
  // Average weeks per month (52 weeks / 12 months).
  return profile.base_rate / (profile.weekly_hours_baseline * (52 / 12));
}

export function calculatePay(
  profile: SalaryProfileInput,
  hours: ShiftHours,
  policy: OvertimePolicy,
  adjustments: { type: 'bonus' | 'deduction' | 'addition'; amount: number }[],
): PayrollAmounts {
  const adjustmentsTotal = round2(
    adjustments.reduce((sum, a) => sum + (a.type === 'deduction' ? -a.amount : a.amount), 0),
  );

  if (profile.pay_type === 'monthly') {
    const grossBase = round2(profile.base_rate);
    let grossOvertime = 0;
    if (profile.overtime_eligible) {
      const hourlyEquivalent = monthlyHourlyEquivalent(profile);
      if (hourlyEquivalent !== null) {
        grossOvertime = round2(
          hours.overtime125Hours * hourlyEquivalent * policy.rate_125 +
            hours.overtime150Hours * hourlyEquivalent * policy.rate_150 +
            hours.weekendHolidayHours * hourlyEquivalent * policy.weekend_holiday_rate,
        );
      }
    }
    return {
      grossBase,
      grossOvertime,
      adjustmentsTotal,
      grossTotal: round2(grossBase + grossOvertime + adjustmentsTotal),
    };
  }

  // Hourly
  const hourlyRate = profile.base_rate;
  const grossBase = round2(hours.regularHours * hourlyRate);
  const grossOvertime = round2(
    hours.overtime125Hours * hourlyRate * policy.rate_125 +
      hours.overtime150Hours * hourlyRate * policy.rate_150 +
      hours.weekendHolidayHours * hourlyRate * policy.weekend_holiday_rate,
  );
  return {
    grossBase,
    grossOvertime,
    adjustmentsTotal,
    grossTotal: round2(grossBase + grossOvertime + adjustmentsTotal),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
