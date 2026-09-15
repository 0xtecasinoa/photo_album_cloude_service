ALTER TABLE "photos" ADD COLUMN "design_value" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "measured_value" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "ocr_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "ocr_text" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "ocr_confidence" integer;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "ocr_processed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "photos_ocr_idx" ON "photos" USING btree ("project_id","ocr_status");