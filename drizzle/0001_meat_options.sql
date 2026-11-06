-- Meat options: Gemischt is replaced by Hack/Steak/Unbekannt. Existing "gemischt" entries become "unbekannt".
ALTER TABLE "entry" ALTER COLUMN "meat" SET DATA TYPE text;--> statement-breakpoint
UPDATE "entry" SET "meat" = 'unbekannt' WHERE "meat" = 'gemischt';--> statement-breakpoint
DROP TYPE "public"."meat";--> statement-breakpoint
CREATE TYPE "public"."meat" AS ENUM('kalb', 'haehnchen', 'hack', 'steak', 'veggie', 'unbekannt');--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "meat" SET DATA TYPE "public"."meat" USING "meat"::"public"."meat";
