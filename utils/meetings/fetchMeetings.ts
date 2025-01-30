"use server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { refreshAndUpdateToken } from "@/utils/tokenRefresh";
import {
  fetchGoogleEvents,
  normalizeGoogleEvents,
} from "@/utils/calendar/providers/google";
import {
  fetchMicrosoftEvents,
  normalizeMicrosoftEvents,
} from "@/utils/calendar/providers/microsoft";
import { validateMeetings } from "@/utils/calendar/validation";
import type { Meeting } from "@/db/schema";

export async function fetchMeetings(
  accountId: string
): Promise<Omit<Meeting, "user_id" | "created_at" | "updated_at">[] | null> {
  const supabase = await createClient();

  // Authentication
  const { user, error: authError } = await getAuthenticatedUser(supabase);
  if (authError || !user) return null;

  // Account Verification
  const { account, error: accountError } = await verifyLinkedAccount(
    supabase,
    accountId,
    user.id
  );
  if (accountError || !account) return null;

  try {
    const accessToken = await refreshAndUpdateToken(
      accountId,
      account.provider,
      account.refresh_token
    );

    let events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[];

    switch (account.provider) {
      case "google":
        events = normalizeGoogleEvents(
          await fetchGoogleEvents(accessToken),
          account.id
        );
        break;
      case "microsoft":
      case "azure-ad":
        events = normalizeMicrosoftEvents(
          await fetchMicrosoftEvents(accessToken),
          account.id
        );
        break;
      default:
        throw new Error("Unsupported calendar provider");
    }

    return validateMeetings(events);
  } catch (error) {
    console.error("Meeting sync failed:", error);
    return null;
  }
}

// Helper Functions
async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

async function verifyLinkedAccount(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("linked_accounts")
    .select("id, provider, refresh_token")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  return { account: data, error };
}
