ALTER TABLE "linked_accounts" ADD COLUMN "webhook_channel_id" text;--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD COLUMN "webhook_resource_id" text;--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD COLUMN "webhook_expiration" timestamp;