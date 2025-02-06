import { createClient } from "@/utils/supabase/client";

export async function fetchLinkedAccounts(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("linked_accounts")
    .select("id, email, provider, color, account_name, last_synced")
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
