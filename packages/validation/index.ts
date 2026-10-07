import { z } from "zod";
import { day, today } from "../domain/index.js";
export const id = z.string().uuid();
const text = z.string().trim().max(2000);
const short = z.string().trim().min(1).max(120);
export const date = z.string().refine((v) => {
  try {
    return day(v) <= day(today());
  } catch {
    return false;
  }
}, "Use a valid date, not in the future");
const pos = z.number().finite().positive().max(1e9);
const nonneg = z.number().finite().nonnegative().max(1e9);
const nullable = nonneg.nullable().optional();
const percent = z.number().min(0).max(100);
export const credentials = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const farm = z.object({
  name: short,
  location: text.default(""),
  areaAcres: pos,
});
export const pond = z.object({ farmId: id, name: short, areaAcres: pos });
export const cycle = z.object({
  pondId: id,
  stockingDate: date,
  stocked: pos.int(),
  species: z.literal("Litopenaeus vannamei").default("Litopenaeus vannamei"),
  plStage: text.default(""),
  source: text.default(""),
  seedCost: nullable,
  initialBiomassKg: nullable,
  notes: text.default(""),
  feedComplete: z.boolean().default(false),
  costsComplete: z.boolean().default(false),
});
export const assumption = z
  .object({
    date,
    low: percent,
    base: percent,
    high: percent,
    notes: text.default(""),
  })
  .refine((v) => v.low <= v.base && v.base <= v.high, "Use low ≤ base ≤ high");
export const daily = z.object({
  date,
  feedKg: nullable,
  feedings: z.number().int().min(1).max(24).nullable().optional(),
  brand: text.default(""),
  feedCost: nullable,
  mortality: z.number().int().nonnegative().max(1e8).nullable().optional(),
  behavior: z
    .enum(["NORMAL", "WATCH", "CONCERN", "UNKNOWN"])
    .default("UNKNOWN"),
  appearance: text.default(""),
  weather: text.default(""),
  aerator: text.default(""),
  treatment: text.default(""),
  nearby: text.default(""),
  notes: text.default(""),
});
export const sample = z.object({
  date,
  count: pos.int(),
  weightG: pos,
  method: short,
  representative: z.enum(["YES", "NO", "UNKNOWN"]).default("UNKNOWN"),
  scaleChecked: z.boolean().default(false),
  notes: text.default(""),
});
export const cost = z.object({
  date,
  category: short,
  amount: pos,
  note: text.default(""),
});
export const market = z.object({
  date,
  location: short,
  countPerKg: pos,
  price: pos,
  source: short,
  note: text.default(""),
});
export const event = z.object({ date, kind: short, notes: short });
export const decision = z.object({
  date,
  decision: short,
  reason: text,
  scenarioId: id.nullable().optional(),
});
export const outcome = z.object({ date, outcome: short });
export const harvest = z.object({
  date,
  weightKg: pos,
  price: pos,
  final: z.boolean(),
  notes: text.default(""),
});
export const water = z
  .object({
    date,
    metric: z.enum([
      "DO",
      "pH",
      "ammonia",
      "nitrite",
      "salinity",
      "temperature",
    ]),
    value: z.number().finite(),
    unit: z.enum(["mg/L", "ppt", "°C", "pH"]),
    source: short,
    notes: text.default(""),
  })
  .superRefine((v, ctx) => {
    const units = {
      DO: "mg/L",
      pH: "pH",
      ammonia: "mg/L",
      nitrite: "mg/L",
      salinity: "ppt",
      temperature: "°C",
    };
    const bounds = {
      DO: [0, 30],
      pH: [0, 14],
      ammonia: [0, 100],
      nitrite: [0, 100],
      salinity: [0, 100],
      temperature: [0, 60],
    };
    if (
      v.unit !== units[v.metric] ||
      v.value < bounds[v.metric][0] ||
      v.value > bounds[v.metric][1]
    )
      ctx.addIssue({
        code: "custom",
        message: "Check instrument units and physical range",
      });
  });
export const scenario = z.object({
  date,
  price: pos,
  dailyFeedKg: nonneg,
  feedPrice: nonneg,
  dailyOperating: nonneg,
  growthOverride: z.number().min(-2).max(5).nullable().optional(),
  notes: text.default(""),
});
export const completeness = z.object({
  feedComplete: z.boolean(),
  costsComplete: z.boolean(),
  initialBiomassKg: nullable,
  reason: short,
});
export const recordSchemas = {
  daily,
  sample,
  cost,
  market,
  event,
  assumption,
  decision,
  harvest,
  water,
  scenario,
};
export type RecordKind = keyof typeof recordSchemas;
