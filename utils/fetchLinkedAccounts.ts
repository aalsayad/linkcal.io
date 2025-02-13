import { createClient } from "@/utils/supabase/client";

export async function fetchLinkedAccounts(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("linked_accounts")
    .select(
      "account_name, color, email, id, last_synced, provider, user_id, webhook_resource_id, webhook_expiration"
    )
    .eq("user_id", userId);

  if (error) {
    console.error(
      "[fetchLinkedAccounts.ts] Error fetching linked accounts:",
      error
    );
    return [];
  }
  return data;
}
