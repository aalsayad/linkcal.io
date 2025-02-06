DROP INDEX "unique_external_provider";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_external_provider" ON "meetings" USING btree ("external_event_id","provider","linked_account_id");