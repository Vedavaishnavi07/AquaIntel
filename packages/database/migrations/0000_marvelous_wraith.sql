CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"farm_id" uuid,
	"action" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crop_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "culture_cycles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pond_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_assumptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"farm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvest_scenarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_predictions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"state" text DEFAULT 'EXPERIMENTAL' NOT NULL,
	"model_version" text NOT NULL,
	"input_version" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ponds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"farm_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prediction_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sampling_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sampling_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "water_quality_readings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cycle_id" uuid NOT NULL,
	"date" text NOT NULL,
	"basis" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_events" ADD CONSTRAINT "crop_events_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_events" ADD CONSTRAINT "crop_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "culture_cycles" ADD CONSTRAINT "culture_cycles_pond_id_ponds_id_fk" FOREIGN KEY ("pond_id") REFERENCES "public"."ponds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_assumptions" ADD CONSTRAINT "cycle_assumptions_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_assumptions" ADD CONSTRAINT "cycle_assumptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_records" ADD CONSTRAINT "feed_records_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_records" ADD CONSTRAINT "feed_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_scenarios" ADD CONSTRAINT "harvest_scenarios_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_scenarios" ADD CONSTRAINT "harvest_scenarios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_predictions" ADD CONSTRAINT "model_predictions_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_feedback" ADD CONSTRAINT "prediction_feedback_prediction_id_model_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."model_predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sampling_images" ADD CONSTRAINT "sampling_images_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sampling_records" ADD CONSTRAINT "sampling_records_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sampling_records" ADD CONSTRAINT "sampling_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_quality_readings" ADD CONSTRAINT "water_quality_readings_cycle_id_culture_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."culture_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_quality_readings" ADD CONSTRAINT "water_quality_readings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_cycle_date" ON "alerts" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "cost_records_cycle_date" ON "cost_records" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "crop_events_cycle_date" ON "crop_events" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "cycle_assumptions_cycle_date" ON "cycle_assumptions" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "daily_logs_cycle_date" ON "daily_logs" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "decision_records_cycle_date" ON "decision_records" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_unique" ON "farm_members" USING btree ("farm_id","user_id");--> statement-breakpoint
CREATE INDEX "feed_records_cycle_date" ON "feed_records" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "harvest_scenarios_cycle_date" ON "harvest_scenarios" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "harvests_cycle_date" ON "harvests" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "market_prices_cycle_date" ON "market_prices" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "sampling_records_cycle_date" ON "sampling_records" USING btree ("cycle_id","date");--> statement-breakpoint
CREATE INDEX "water_quality_readings_cycle_date" ON "water_quality_readings" USING btree ("cycle_id","date");