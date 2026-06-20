import { describe, expect, it } from 'vitest';
import { aggregateShiftHours, calculatePay, computeShiftHours } from './payroll-logic';
import type { OvertimePolicy } from './payroll-logic';

const policy: OvertimePolicy = {
  daily_regular_hours: 8,
  daily_125_hours: 2,
  rate_125: 1.25,
  rate_150: 1.5,
  weekend_holiday_rate: 1.5,
};

// A Sunday in the local test environment's timezone-agnostic UTC sense -
// 2026-06-21 is a Sunday.
function weekday(hour: number, durationHours: number) {
  const clockIn = new Date(Date.UTC(2026, 5, 21, hour, 0, 0));
  const clockOut = new Date(clockIn.getTime() + durationHours * 3_600_000);
  return { clockIn, clockOut };
}

// 2026-06-20 is a Saturday.
function saturday(hour: number, durationHours: number) {
  const clockIn = new Date(Date.UTC(2026, 5, 20, hour, 0, 0));
  const clockOut = new Date(clockIn.getTime() + durationHours * 3_600_000);
  return { clockIn, clockOut };
}

describe('computeShiftHours', () => {
  it('exactly 8 hours is all regular', () => {
    const { clockIn, clockOut } = weekday(8, 8);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 8,
      overtime125Hours: 0,
      overtime150Hours: 0,
      weekendHolidayHours: 0,
    });
  });

  it('9.5 hours splits into 8 regular + 1.5 at 125%', () => {
    const { clockIn, clockOut } = weekday(8, 9.5);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 8,
      overtime125Hours: 1.5,
      overtime150Hours: 0,
      weekendHolidayHours: 0,
    });
  });

  it('exactly 10 hours splits into 8 regular + 2 at 125%, none at 150%', () => {
    const { clockIn, clockOut } = weekday(8, 10);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 8,
      overtime125Hours: 2,
      overtime150Hours: 0,
      weekendHolidayHours: 0,
    });
  });

  it('11 hours splits into 8 regular + 2 at 125% + 1 at 150%', () => {
    const { clockIn, clockOut } = weekday(8, 11);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 8,
      overtime125Hours: 2,
      overtime150Hours: 1,
      weekendHolidayHours: 0,
    });
  });

  it('Saturday work counts entirely as weekend/holiday hours, even if short', () => {
    const { clockIn, clockOut } = saturday(10, 3);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 0,
      overtime125Hours: 0,
      overtime150Hours: 0,
      weekendHolidayHours: 3,
    });
  });

  it('a long Saturday shift is still entirely weekend/holiday hours (no 125/150 split)', () => {
    const { clockIn, clockOut } = saturday(8, 11);
    expect(computeShiftHours(clockIn, clockOut, policy)).toEqual({
      regularHours: 0,
      overtime125Hours: 0,
      overtime150Hours: 0,
      weekendHolidayHours: 11,
    });
  });
});

describe('aggregateShiftHours', () => {
  it('sums multiple sessions across the period', () => {
    const sessions = [weekday(8, 8), weekday(8, 9.5), saturday(8, 11)];
    expect(aggregateShiftHours(sessions, policy)).toEqual({
      regularHours: 16,
      overtime125Hours: 1.5,
      overtime150Hours: 0,
      weekendHolidayHours: 11,
    });
  });
});

describe('calculatePay', () => {
  it('hourly employee: regular + 125% + 150% + weekend all paid at their respective rates', () => {
    const result = calculatePay(
      { pay_type: 'hourly', base_rate: 100, weekly_hours_baseline: null, overtime_eligible: true },
      { regularHours: 8, overtime125Hours: 2, overtime150Hours: 1, weekendHolidayHours: 0 },
      policy,
      [],
    );
    // base: 8*100=800; overtime: 2*100*1.25 + 1*100*1.5 = 250+150=400
    expect(result).toEqual({
      grossBase: 800,
      grossOvertime: 400,
      adjustmentsTotal: 0,
      grossTotal: 1200,
    });
  });

  it('monthly non-overtime-eligible employee ignores overtime hours entirely', () => {
    const result = calculatePay(
      { pay_type: 'monthly', base_rate: 12000, weekly_hours_baseline: 42, overtime_eligible: false },
      { regularHours: 160, overtime125Hours: 20, overtime150Hours: 5, weekendHolidayHours: 0 },
      policy,
      [],
    );
    expect(result).toEqual({
      grossBase: 12000,
      grossOvertime: 0,
      adjustmentsTotal: 0,
      grossTotal: 12000,
    });
  });

  it('applies bonuses and deductions on top of gross pay', () => {
    const result = calculatePay(
      { pay_type: 'hourly', base_rate: 50, weekly_hours_baseline: null, overtime_eligible: true },
      { regularHours: 8, overtime125Hours: 0, overtime150Hours: 0, weekendHolidayHours: 0 },
      policy,
      [
        { type: 'bonus', amount: 200 },
        { type: 'deduction', amount: 50 },
      ],
    );
    // base: 400; adjustments: +200-50=150; total: 550
    expect(result).toEqual({
      grossBase: 400,
      grossOvertime: 0,
      adjustmentsTotal: 150,
      grossTotal: 550,
    });
  });
});
