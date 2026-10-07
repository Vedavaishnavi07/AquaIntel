import { randomUUID } from "node:crypto";
import type { DB } from "../../packages/database/client.js";
import {
  sampling,
  growth,
  biomass,
  fcr,
  day,
  today,
  scenarios,
  money,
  total,
  doc,
  costByCategory,
} from "../../packages/domain/index.js";
export const tables = {
  daily: "daily_logs",
  feed: "feed_records",
  sample: "sampling_records",
  water: "water_quality_readings",
  cost: "cost_records",
  market: "market_prices",
  event: "crop_events",
  assumption: "cycle_assumptions",
  decision: "decision_records",
  harvest: "harvests",
  scenario: "harvest_scenarios",
} as const;
export type TableKind = keyof typeof tables;
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(db: DB, userId: string, cycleId: string) {
  const r = await db.query(
    "SELECT c.*, p.farm_id, p.data AS pond_data, m.role FROM culture_cycles c JOIN ponds p ON p.id=c.pond_id JOIN farm_members m ON m.farm_id=p.farm_id WHERE c.id=$1 AND m.user_id=$2",
    [cycleId, userId],
  );
  if (!r.rows.length) throw new HttpError(404, "Crop not found");
  return r.rows[0];
}
export async function farmAccess(db: DB, userId: string, farmId: string) {
  if (
    !(
      await db.query(
        "SELECT id FROM farm_members WHERE farm_id=$1 AND user_id=$2",
        [farmId, userId],
      )
    ).rows.length
  )
    throw new HttpError(404, "Farm not found");
}
export async function audit(
  db: DB,
  userId: string,
  farmId: string | null,
  action: string,
  data: unknown,
) {
  await db.query(
    "INSERT INTO audit_events(id,user_id,farm_id,action,data) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), userId, farmId, action, JSON.stringify(data)],
  );
}
export async function insertRecord(
  db: DB,
  kind: TableKind,
  cycleId: string,
  userId: string,
  date: string,
  basis: string,
  data: any,
  id = randomUUID(),
) {
  await db.query(
    "INSERT INTO " +
      tables[kind] +
      "(id,cycle_id,date,basis,data,created_by) VALUES($1,$2,$3,$4,$5,$6)",
    [id, cycleId, date, basis, JSON.stringify(data), userId],
  );
  return id;
}
export async function records(
  db: DB,
  cycleId: string,
  asOf = today(),
  includeVoided = false,
) {
  const result: Record<string, any[]> = {};
  for (const [key, table] of Object.entries(tables)) {
    result[key] = (
      await db.query(
        "SELECT * FROM " +
          table +
          " WHERE cycle_id=$1 AND date <= $2 " +
          (includeVoided ? "" : "AND NOT (data ? 'voidedAt')") +
          " ORDER BY date,created_at LIMIT 5001",
        [cycleId, asOf],
      )
    ).rows;
  }
  return result;
}
export function summary(cycle: any, r: Record<string, any[]>, asOf = today()) {
  const samples = r.sample.map((s) => ({
    ...s,
    ...sampling(s.data.count, s.data.weightG),
  }));
  const latest = samples.at(-1) || null;
  const previous = latest
    ? samples.filter((s) => s.date < latest.date).at(-1)
    : null;
  const g = latest && previous ? growth(previous, latest) : null;
  const assumption = r.assumption.at(-1)?.data || null;
  const hasHarvest = r.harvest.length > 0;
  const bands =
    latest && assumption && !hasHarvest
      ? {
          low: biomass(cycle.data.stocked, latest.abw, assumption.low),
          base: biomass(cycle.data.stocked, latest.abw, assumption.base),
          high: biomass(cycle.data.stocked, latest.abw, assumption.high),
        }
      : null;
  const feed = total(r.feed.map((x) => x.data.kg));
  const costs = total(r.cost.map((x) => x.data.amountPaise));
  const warnings: string[] = [];
  if (!latest || day(asOf) - day(latest.date) > 7)
    warnings.push("Sampling overdue — add a representative weighed sample.");
  if (!r.daily.some((d) => d.date === asOf && d.data.feedKg != null))
    warnings.push("Today’s feed has not been recorded.");
  if (!r.market.length || day(asOf) - day(r.market.at(-1)!.date) > 3)
    warnings.push(
      "Market prices need updating — entries are manual, not live.",
    );
  if (!cycle.data.feedComplete)
    warnings.push("Feed history is incomplete. FCR is unavailable.");
  if (!cycle.data.costsComplete)
    warnings.push(
      "Cost history is incomplete. Margins exclude unrecorded costs.",
    );
  if (hasHarvest)
    warnings.push(
      "Harvest recorded. Standing biomass and scenarios are unavailable after a harvest; reconciliation is required.",
    );
  const mortal = r.daily.filter((d) => d.data.mortality != null);
  if (mortal.length >= 4) {
    const recent = mortal.at(-1)!.data.mortality;
    const prior = mortal.slice(-4, -1).map((d) => d.data.mortality);
    const avg = total(prior) / 3;
    if (recent > avg * 2 && recent > 0)
      warnings.push(
        "Reported mortality increased versus the prior three observations. Review the records and seek qualified help if needed.",
      );
  }
  if (g && g.daily <= 0)
    warnings.push(
      "Latest measured ABW did not increase. Check sample representativeness and scale measurements.",
    );
  const feedAtSample = latest
    ? total(r.feed.filter((x) => x.date <= latest.date).map((x) => x.data.kg))
    : 0;
  if (latest && latest.abw > 100)
    warnings.push(
      "Sample ABW exceeds the V0 review threshold of 100 g. Verify weight units and sample count; this is a data-quality flag.",
    );
  const value =
    bands && r.feed.some((x) => x.date <= latest.date)
      ? fcr(
          feedAtSample,
          bands.base,
          cycle.data.initialBiomassKg ?? null,
          cycle.data.feedComplete,
        )
      : null;
  return {
    doc: doc(cycle.data.stockingDate, asOf),
    samples,
    latest,
    growth: g,
    assumption,
    biomass: bands,
    feedKg: r.feed.length ? feed : null,
    costByCategory: costByCategory(r.cost.map((x) => x.data)),
    costPaise: r.cost.length ? costs : null,
    fcr: value,
    warnings,
    hasHarvest,
    limited: Object.values(r).some((a) => a.length > 5000),
  };
}
export function computeScenario(
  cycle: any,
  r: Record<string, any[]>,
  input: any,
) {
  const s = summary(cycle, r, input.date);
  if (s.hasHarvest)
    throw new HttpError(
      422,
      "Scenarios after a harvest require biomass reconciliation and are not supported in V0.",
    );
  if (!s.latest || !s.assumption)
    throw new HttpError(422, "Add sampling and a survival assumption first.");
  const config = {
    asOf: input.date,
    sampleDate: s.latest.date,
    abw: s.latest.abw,
    dailyGrowth: input.growthOverride ?? s.growth?.daily ?? null,
    stocked: cycle.data.stocked,
    survival: {
      low: s.assumption.low,
      base: s.assumption.base,
      high: s.assumption.high,
    },
    pricePaise: money(input.price),
    dailyFeedKg: input.dailyFeedKg,
    feedPricePaise: money(input.feedPrice),
    dailyOperatingPaise: money(input.dailyOperating),
    recordedCostPaise: s.costPaise ?? 0,
    costsComplete: cycle.data.costsComplete && s.costPaise !== null,
  };
  return {
    engineVersion: "deterministic-v1",
    config,
    results: scenarios(config),
    input,
    sourceSampleId: s.latest.id,
    sourceAssumptionId: r.assumption.at(-1)!.id,
    sourceCostIds: r.cost.map((c) => c.id),
    growthBasis: input.growthOverride != null ? "USER_ASSUMED" : "DERIVED",
    dataCutoff: input.date,
    createdAt: new Date().toISOString(),
  };
}
