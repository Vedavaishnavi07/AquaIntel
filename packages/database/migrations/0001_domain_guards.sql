CREATE UNIQUE INDEX active_crop_per_pond ON culture_cycles(pond_id) WHERE status='ACTIVE';
--> statement-breakpoint
CREATE UNIQUE INDEX daily_log_once ON daily_logs(cycle_id,date);
--> statement-breakpoint
ALTER TABLE culture_cycles ADD CONSTRAINT cycle_status CHECK(status IN ('ACTIVE','CLOSED'));
--> statement-breakpoint
ALTER TABLE farm_members ADD CONSTRAINT member_role CHECK(role IN ('OWNER','EDITOR'));
--> statement-breakpoint
ALTER TABLE sampling_records ADD CONSTRAINT positive_sampling CHECK ((data->>'count')::numeric > 0 AND (data->>'weightG')::numeric > 0);
--> statement-breakpoint
ALTER TABLE feed_records ADD CONSTRAINT nonnegative_feed CHECK ((data->>'kg')::numeric >= 0);
--> statement-breakpoint
ALTER TABLE cost_records ADD CONSTRAINT positive_cost CHECK ((data->>'amountPaise')::bigint > 0);
--> statement-breakpoint
ALTER TABLE market_prices ADD CONSTRAINT positive_price CHECK ((data->>'pricePaise')::bigint > 0 AND (data->>'countPerKg')::numeric > 0);
--> statement-breakpoint
ALTER TABLE cycle_assumptions ADD CONSTRAINT survival_bounds CHECK ((data->>'low')::numeric >= 0 AND (data->>'low')::numeric <= (data->>'base')::numeric AND (data->>'base')::numeric <= (data->>'high')::numeric AND (data->>'high')::numeric <= 100);
--> statement-breakpoint
ALTER TABLE sampling_images ADD CONSTRAINT sampling_image_record_fk FOREIGN KEY (record_id) REFERENCES sampling_records(id);
--> statement-breakpoint
ALTER TABLE event_images ADD CONSTRAINT event_image_record_fk FOREIGN KEY (record_id) REFERENCES crop_events(id);
--> statement-breakpoint
ALTER TABLE model_predictions ADD CONSTRAINT lifecycle_state CHECK(state IN ('EXPERIMENTAL','CANDIDATE','SHADOW','VALIDATED','PRODUCTION','RETIRED'));
--> statement-breakpoint
CREATE INDEX session_user_idx ON sessions(user_id);
--> statement-breakpoint
CREATE INDEX pond_farm ON ponds(farm_id);
--> statement-breakpoint
CREATE INDEX cycle_pond ON culture_cycles(pond_id);
