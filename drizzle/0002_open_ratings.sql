-- Entries can be saved first and rated later ("offen" while overall is null).
ALTER TABLE "entry" ALTER COLUMN "overall" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "rated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "entry" SET "rated_at" = "updated_at" WHERE "overall" IS NOT NULL;
