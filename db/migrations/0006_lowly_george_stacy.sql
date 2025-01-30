ALTER TABLE "meetings" RENAME COLUMN "date" TO "start_date";--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "end_date" timestamp NOT NULL;