CREATE TABLE "contact_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"topic" text NOT NULL,
	"message" text,
	"plan_interest" text,
	"organization_id" uuid,
	"user_id" uuid,
	"status" text DEFAULT 'new' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_inquiries_created_idx" ON "contact_inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_inquiries_status_idx" ON "contact_inquiries" USING btree ("status");