CREATE TABLE "access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"user_email" text,
	"user_name" text,
	"organization_name" text,
	"path" text NOT NULL,
	"section" text,
	"referrer" text,
	"ip_address" text,
	"user_agent" text,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_logs_created_idx" ON "access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "access_logs_user_idx" ON "access_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "access_logs_path_idx" ON "access_logs" USING btree ("path");