DROP INDEX daily_log_once;
--> statement-breakpoint
CREATE UNIQUE INDEX daily_log_once ON daily_logs(cycle_id,date) WHERE NOT (data ? 'voidedAt');
--> statement-breakpoint
CREATE TABLE environment_identity (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), mode text NOT NULL CHECK(mode IN ('DEMO','PILOT')));
