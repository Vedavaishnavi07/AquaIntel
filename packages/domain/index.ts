export class DomainError extends Error {}
/** All weights are grams for sampling, kilograms for biomass/feed; money is integer paise. */
export const BASES = [
  "MEASURED",
  "USER_REPORTED",
  "USER_ASSUMED",
  "DERIVED",
  "FORECAST",
  "EXTERNAL",
  "UNKNOWN",
] as const;
export type Basis = (typeof BASES)[number];
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function day(date: string): number {
  const t = Date.parse(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(t) ||
    new Date(t).toISOString().slice(0, 10) !== date
  )
    throw new DomainError("Invalid calendar date");
  return t / 86400000;
}
export function doc(stocked: string, observed: string) {
  const n = day(observed) - day(stocked);
  if (n < 0) throw new DomainError("Observation predates stocking");
  return n;
}
function positive(n: number) {
  if (!Number.isFinite(n) || n <= 0) throw new DomainError("Must be positive");
  return n;
}
function nonnegative(n: number) {
  if (!Number.isFinite(n) || n < 0)
    throw new DomainError("Must not be negative");
  return n;
}
export function sampling(count: number, weightG: number) {
  positive(count);
  if (!Number.isInteger(count))
    throw new DomainError("Sample count must be whole");
  positive(weightG);
  const abw = weightG / count;
  return { abw, countPerKg: 1000 / abw };
}
export function growth(
  previous: { date: string; abw: number },
  current: { date: string; abw: number },
) {
  positive(previous.abw);
  positive(current.abw);
  const days = day(current.date) - day(previous.date);
  if (days <= 0)
    throw new DomainError("Growth requires different increasing sample dates");
  const change = current.abw - previous.abw;
  return {
    change,
    daily: change / days,
    days,
    countChange: 1000 / current.abw - 1000 / previous.abw,
  };
}
export function survivalBand(low: number, base: number, high: number) {
  if (
    ![low, base, high].every((n) => Number.isFinite(n) && n >= 0 && n <= 100) ||
    low > base ||
    base > high
  )
    throw new DomainError("Survival must satisfy 0 ≤ low ≤ base ≤ high ≤ 100");
  return { low, base, high };
}
export function biomass(stocked: number, abw: number, survival: number) {
  positive(stocked);
  positive(abw);
  survivalBand(survival, survival, survival);
  return (((stocked * survival) / 100) * abw) / 1000;
}
export const total = (values: number[]) =>
  values.reduce((sum, n) => sum + nonnegative(n), 0);
export function money(rupees: number) {
  nonnegative(rupees);
  const p = Math.round((rupees + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(p))
    throw new DomainError("Money exceeds supported range");
  return p;
}
function safePaise(n: number) {
  if (!Number.isSafeInteger(n))
    throw new DomainError("Money exceeds supported range");
  return n;
}
export function costByCategory(
  rows: { category: string; amountPaise: number }[],
) {
  const result: Record<string, number> = {};
  for (const row of rows) {
    nonnegative(row.amountPaise);
    result[row.category] = safePaise(
      (result[row.category] ?? 0) + row.amountPaise,
    );
  }
  return result;
}
export function feedCost(kg: number, paisePerKg: number) {
  nonnegative(kg);
  nonnegative(paisePerKg);
  return safePaise(Math.round(kg * paisePerKg));
}
export function revenue(kg: number, paisePerKg: number) {
  nonnegative(kg);
  positive(paisePerKg);
  return safePaise(Math.round(kg * paisePerKg));
}
export function profit(revenuePaise: number, costPaise: number) {
  nonnegative(revenuePaise);
  nonnegative(costPaise);
  return safePaise(revenuePaise - costPaise);
}
export function fcr(
  feedKg: number,
  biomassKg: number,
  initialBiomassKg: number | null,
  feedComplete: boolean,
  harvestedKg = 0,
) {
  nonnegative(feedKg);
  nonnegative(biomassKg);
  nonnegative(harvestedKg);
  if (!feedComplete || initialBiomassKg === null) return null;
  nonnegative(initialBiomassKg);
  const gain = biomassKg + harvestedKg - initialBiomassKg;
  return gain > 0 ? feedKg / gain : null;
}
export interface ScenarioInput {
  asOf: string;
  sampleDate: string;
  abw: number;
  dailyGrowth: number | null;
  stocked: number;
  survival: { low: number; base: number; high: number };
  pricePaise: number;
  dailyFeedKg: number;
  feedPricePaise: number;
  dailyOperatingPaise: number;
  recordedCostPaise: number;
  costsComplete: boolean;
}
export function scenarios(input: ScenarioInput) {
  positive(input.abw);
  positive(input.stocked);
  positive(input.pricePaise);
  survivalBand(input.survival.low, input.survival.base, input.survival.high);
  [
    input.dailyFeedKg,
    input.feedPricePaise,
    input.dailyOperatingPaise,
    input.recordedCostPaise,
  ].forEach(nonnegative);
  const sampleAge = doc(input.sampleDate, input.asOf);
  if (input.dailyGrowth !== null && !Number.isFinite(input.dailyGrowth))
    throw new DomainError("Invalid growth rate");
  return [0, 3, 7, 14].map((days) => {
    const projectedDays = sampleAge + days;
    const abw =
      projectedDays === 0
        ? input.abw
        : input.dailyGrowth === null
          ? null
          : input.abw + input.dailyGrowth * projectedDays;
    const additionalFeedKg = days * input.dailyFeedKg;
    const additionalCostPaise =
      feedCost(additionalFeedKg, input.feedPricePaise) +
      days * input.dailyOperatingPaise;
    const bands =
      abw !== null && abw > 0
        ? Object.fromEntries(
            Object.entries(input.survival).map(([key, s]) => {
              const kg = biomass(input.stocked, abw, s),
                rev = revenue(kg, input.pricePaise);
              return [
                key,
                {
                  biomassKg: kg,
                  revenuePaise: rev,
                  marginPaise: profit(
                    rev,
                    input.recordedCostPaise + additionalCostPaise,
                  ),
                  profitPaise: input.costsComplete
                    ? profit(rev, input.recordedCostPaise + additionalCostPaise)
                    : null,
                },
              ];
            }),
          )
        : null;
    return {
      days,
      abw: abw !== null && abw > 0 ? abw : null,
      countPerKg: abw !== null && abw > 0 ? 1000 / abw : null,
      additionalFeedKg,
      additionalCostPaise,
      bands,
      basis: "FORECAST" as const,
      note: "Scenario, not a harvest recommendation. Constant user-assumed survival, feed and price; no mortality, weather or price prediction.",
    };
  });
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Array.from(new Set(rows.flatMap(Object.keys)));
  const cell = (v: unknown) => {
    let s =
      v === null || v === undefined
        ? ""
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(cell).join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ].join("\r\n");
}
