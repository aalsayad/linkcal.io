ALTER TABLE "linked_accounts" DROP CONSTRAINT "linked_accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;