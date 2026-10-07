import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});
export const farms = pgTable("farms", {
  id: uuid("id").primaryKey(),
  data: jsonb("data").notNull(),
  ...timestamps,
});
export const farmMembers = pgTable(
  "farm_members",
  {
    id: uuid("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("membership_unique").on(t.farmId, t.userId)],
);
export const ponds = pgTable("ponds", {
  id: uuid("id").primaryKey(),
  farmId: uuid("farm_id")
    .notNull()
    .references(() => farms.id),
  data: jsonb("data").notNull(),
  ...timestamps,
});
export const cultureCycles = pgTable("culture_cycles", {
  id: uuid("id").primaryKey(),
  pondId: uuid("pond_id")
    .notNull()
    .references(() => ponds.id),
  status: text("status").notNull().default("ACTIVE"),
  data: jsonb("data").notNull(),
  ...timestamps,
});
function record(name: string) {
  return pgTable(
    name,
    {
      id: uuid("id").primaryKey(),
      cycleId: uuid("cycle_id")
        .notNull()
        .references(() => cultureCycles.id),
      date: text("date").notNull(),
      basis: text("basis").notNull(),
      data: jsonb("data").notNull(),
      createdBy: uuid("created_by")
        .notNull()
        .references(() => users.id),
      ...timestamps,
    },
    (t) => [index(name + "_cycle_date").on(t.cycleId, t.date)],
  );
}
export const cycleAssumptions = record("cycle_assumptions");
export const dailyLogs = record("daily_logs");
export const feedRecords = record("feed_records");
export const samplingRecords = record("sampling_records");
export const waterQualityReadings = record("water_quality_readings");
export const costRecords = record("cost_records");
export const marketPrices = record("market_prices");
export const cropEvents = record("crop_events");
export const harvestScenarios = record("harvest_scenarios");
export const decisionRecords = record("decision_records");
export const harvests = record("harvests");
export const alerts = record("alerts");
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  farmId: uuid("farm_id").references(() => farms.id),
  action: text("action").notNull(),
  data: jsonb("data").notNull(),
  ...timestamps,
});
const imageColumns = () => ({
  id: uuid("id").primaryKey(),
  cycleId: uuid("cycle_id")
    .notNull()
    .references(() => cultureCycles.id),
  recordId: uuid("record_id").notNull(),
  data: jsonb("data").notNull(),
  ...timestamps,
});
export const samplingImages = pgTable("sampling_images", imageColumns());
export const eventImages = pgTable("event_images", imageColumns());
export const modelPredictions = pgTable("model_predictions", {
  id: uuid("id").primaryKey(),
  cycleId: uuid("cycle_id")
    .notNull()
    .references(() => cultureCycles.id),
  state: text("state").notNull().default("EXPERIMENTAL"),
  modelVersion: text("model_version").notNull(),
  inputVersion: text("input_version").notNull(),
  data: jsonb("data").notNull(),
  ...timestamps,
});
export const predictionFeedback = pgTable("prediction_feedback", {
  id: uuid("id").primaryKey(),
  predictionId: uuid("prediction_id")
    .notNull()
    .references(() => modelPredictions.id),
  data: jsonb("data").notNull(),
  ...timestamps,
});
