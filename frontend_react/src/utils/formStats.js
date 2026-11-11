import { catalogAggregate } from '../services/api';

function rangeFilter(mineId, field, startMs, endMs) {
  return {
    op: 'AND',
    values: [
      { field: 'mineId', op: 'EQ', values: [mineId] },
      { field, op: 'GTE', values: [startMs] },
      { field, op: 'LT', values: [endMs] },
    ],
  };
}

export function getPreviousMonthRange(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = Date.UTC(y, m - 1, 1);
  const end = Date.UTC(y, m, 1);
  const label = new Date(start).toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start, end, label };
}

export function getCurrentQuarterRange(now = new Date()) {
  const y = now.getUTCFullYear();
  const qNum = Math.floor(now.getUTCMonth() / 3) + 1;
  const qStartMonth = (qNum - 1) * 3;
  const start = Date.UTC(y, qStartMonth, 1);
  const end = Date.UTC(y, qStartMonth + 3, 1);
  const labels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
  return { start, end, qNum, label: `Q${qNum} ${y} (${labels[qNum - 1]})` };
}

export function getCurrentFyRange(now = new Date()) {
  const fyStartYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const start = Date.UTC(fyStartYear, 3, 1);
  const end = Date.UTC(fyStartYear + 1, 3, 1);
  return { start, end, label: `${fyStartYear}–${fyStartYear + 1}` };
}

/**
 * Fetches backend-aggregated production, dispatch, attendance, payroll, and stoppage
 * statistics for a mine across [startMs, endMs).
 */
export async function fetchMinePeriodStats(mineId, startMs, endMs) {
  const [prodRes, saleRes, laborDayRes, payrollRes, stoppageRes] = await Promise.all([
    catalogAggregate(
      'ProductionEntry',
      {
        filter: rangeFilter(mineId, 'entryTime', startMs, endMs),
        metrics: [
          { field: 'quantity', function: 'SUM', alias: 'producedQty' },
          { field: 'id', function: 'COUNT', alias: 'prodCount' },
        ],
      },
      { mineId }
    ).catch(() => ({ buckets: [] })),
    catalogAggregate(
      'Sale',
      {
        filter: rangeFilter(mineId, 'dispatchedOn', startMs, endMs),
        metrics: [
          { field: 'quantity', function: 'SUM', alias: 'dispatchedQty' },
          { field: 'saleValue', function: 'SUM', alias: 'dispatchedValue' },
          { field: 'id', function: 'COUNT', alias: 'saleCount' },
        ],
      },
      { mineId }
    ).catch(() => ({ buckets: [] })),
    catalogAggregate(
      'LaborDay',
      {
        filter: rangeFilter(mineId, 'workedOn', startMs, endMs),
        metrics: [
          { field: 'id', function: 'COUNT', alias: 'laborDays' },
          { field: 'belowGroundCount', function: 'SUM', alias: 'bgMandays' },
          { field: 'openCastCount', function: 'SUM', alias: 'ocMandays' },
          { field: 'aboveGroundCount', function: 'SUM', alias: 'agMandays' },
        ],
      },
      { mineId }
    ).catch(() => ({ buckets: [] })),
    catalogAggregate(
      'LaborPayroll',
      {
        filter: rangeFilter(mineId, 'periodStart', startMs, endMs),
        metrics: [
          { field: 'belowGroundWages', function: 'SUM', alias: 'bgWages' },
          { field: 'openCastWages', function: 'SUM', alias: 'ocWages' },
          { field: 'aboveGroundWages', function: 'SUM', alias: 'agWages' },
          { field: 'technicalStaffSalary', function: 'SUM', alias: 'techSalary' },
          { field: 'technicalStaffCount', function: 'SUM', alias: 'techCount' },
          { field: 'id', function: 'COUNT', alias: 'payrollMonths' },
        ],
      },
      { mineId }
    ).catch(() => ({ buckets: [] })),
    catalogAggregate(
      'MineStoppage',
      {
        filter: rangeFilter(mineId, 'stoppedOn', startMs, endMs),
        metrics: [{ field: 'id', function: 'COUNT', alias: 'stoppageDays' }],
      },
      { mineId }
    ).catch(() => ({ buckets: [] })),
  ]);

  const prod = prodRes?.buckets?.[0] || {};
  const sale = saleRes?.buckets?.[0] || {};
  const day = laborDayRes?.buckets?.[0] || {};
  const pay = payrollRes?.buckets?.[0] || {};
  const stop = stoppageRes?.buckets?.[0] || {};

  const bgMandays = day.bgMandays || 0;
  const ocMandays = day.ocMandays || 0;
  const agMandays = day.agMandays || 0;
  const bgWages = pay.bgWages || 0;
  const ocWages = pay.ocWages || 0;
  const agWages = pay.agWages || 0;
  const techSalary = pay.techSalary || 0;

  return {
    producedQty: prod.producedQty || 0,
    prodCount: prod.prodCount || 0,
    dispatchedQty: sale.dispatchedQty || 0,
    dispatchedValue: sale.dispatchedValue || 0,
    saleCount: sale.saleCount || 0,
    laborDays: day.laborDays || 0,
    bgMandays,
    ocMandays,
    agMandays,
    totalMandays: bgMandays + ocMandays + agMandays,
    bgWages,
    ocWages,
    agWages,
    techSalary,
    techCount: pay.techCount || 0,
    payrollMonths: pay.payrollMonths || 0,
    totalWages: bgWages + ocWages + agWages + techSalary,
    stoppageDays: stop.stoppageDays || 0,
  };
}
