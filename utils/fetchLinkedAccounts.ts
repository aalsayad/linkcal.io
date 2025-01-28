import { createClient } from "@/utils/supabase/client";

export async function fetchLinkedAccounts(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("linked_accounts")
    .select("id, email, provider")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching linked accounts:", error);
    return [];
  }

  return data;
}
