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

/**
 * Fetches meetings from the user's linked accounts.
 *
 * @param accountId - The ID of the linked account.
 * @param serviceAccountData - Optional service account data.
 * @returns An array of meetings or null if there's an error.
 */
export async function fetchMeetings(
  accountId: string,
  serviceAccountData?: { id: string; provider: string; refresh_token: string }
): Promise<Omit<Meeting, "user_id" | "created_at" | "updated_at">[] | null> {
  let account;
  if (serviceAccountData) {
    account = serviceAccountData;
    console.debug("[fetchMeetings.ts] Using service account data.");
  } else {
    const supabase = await createClient();
    console.debug("[fetchMeetings.ts] Fetching authenticated user...");
    const { user, error: authError } = await getAuthenticatedUser(supabase);
    if (authError || !user) {
      console.error("[fetchMeetings.ts] Authentication error:", authError);
      return null;
    }
    console.debug("[fetchMeetings.ts] Authenticated user obtained.");

    console.debug(
      `[fetchMeetings.ts] Verifying linked account ${accountId} for the user...`
    );
    const { account: retrievedAccount, error: accountError } =
      await verifyLinkedAccount(supabase, accountId, user.id);
    if (accountError || !retrievedAccount) {
      console.error(
        "[fetchMeetings.ts] Account verification error:",
        accountError
      );
      return null;
    }
    account = retrievedAccount;
    console.debug("[fetchMeetings.ts] Linked account verified.");
  }

  try {
    console.debug("[fetchMeetings.ts] Refreshing access token...");
    const accessToken = await refreshAndUpdateToken(
      account.id,
      account.provider,
      account.refresh_token
    );
    console.debug("[fetchMeetings.ts] Access token refreshed.");

    let events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[];

    switch (account.provider) {
      case "google": {
        console.debug(
          "[fetchMeetings.ts] Fetching events from Google Calendar..."
        );
        const rawGoogleEvents = await fetchGoogleEvents(accessToken);
        console.debug(
          "[fetchMeetings.ts] Fetched events from Google Calendar."
        );
        events = normalizeGoogleEvents(rawGoogleEvents, account.id);
        console.debug(
          "[fetchMeetings.ts] Normalized events from Google Calendar."
        );
        break;
      }
      case "microsoft":
      case "azure-ad": {
        console.debug(
          "[fetchMeetings.ts] Fetching events from Microsoft Calendar..."
        );
        const rawMicrosoftEvents = await fetchMicrosoftEvents(accessToken);
        console.debug(
          "[fetchMeetings.ts] Fetched events from Microsoft Calendar."
        );
        events = normalizeMicrosoftEvents(rawMicrosoftEvents, account.id);
        console.debug(
          "[fetchMeetings.ts] Normalized events from Microsoft Calendar."
        );
        break;
      }
      default:
        throw new Error("Unsupported calendar provider");
    }

    const validatedMeetings = validateMeetings(events);
    console.debug("[fetchMeetings.ts] Meetings validated successfully.");
    return validatedMeetings;
  } catch (error) {
    console.error("[fetchMeetings.ts] Meeting sync failed:", error);
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
