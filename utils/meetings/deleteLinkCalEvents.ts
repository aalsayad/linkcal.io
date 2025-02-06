"use server";

import { createClient } from "@/utils/supabase/server";
import axios, { AxiosResponse } from "axios";
import {
  refreshGoogleToken,
  refreshMicrosoftToken,
} from "@/utils/tokenRefresh";

// Define the expected structure of the response data
interface MicrosoftEventResponse {
  value: Array<{
    id: string;
    subject: string;
  }>;
  "@odata.nextLink"?: string;
}

// Define the expected structure of the Google Calendar API response
interface GoogleCalendarEventResponse {
  items: Array<{
    id: string;
    summary: string;
  }>;
  nextPageToken?: string;
}

export async function deleteLinkCalEvents(accountId: string) {
  console.log(
    "[deleteLinkCalEvents.ts] Starting LinkCal events deletion process..."
  );
  console.log(`[deleteLinkCalEvents.ts] Account ID: ${accountId}`);

  const supabase = await createClient();

  console.log("[deleteLinkCalEvents.ts] Verifying user authentication...");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[deleteLinkCalEvents.ts] Authentication failed:", authError);
    throw new Error("Authentication required");
  }
  console.log("[deleteLinkCalEvents.ts] User authenticated:", user.id);

  console.log("[deleteLinkCalEvents.ts] Fetching account details...");
  const { data: account, error: accountError } = await supabase
    .from("linked_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    console.error(
      "[deleteLinkCalEvents.ts] Account fetch failed:",
      accountError
    );
    throw new Error("Invalid account");
  }
  console.log("[deleteLinkCalEvents.ts] Account found:", account.provider);

  console.log("[deleteLinkCalEvents.ts] Refreshing access token...");
  let accessToken: string;
  try {
    if (account.provider === "google") {
      const tokens = await refreshGoogleToken(account.refresh_token);
      accessToken = tokens.accessToken;
      await supabase
        .from("linked_accounts")
        .update({ refresh_token: tokens.refreshToken })
        .eq("id", accountId);
      console.log("[deleteLinkCalEvents.ts] Google token refreshed");
    } else if (["azure-ad", "microsoft"].includes(account.provider)) {
      const tokens = await refreshMicrosoftToken(account.refresh_token);
      accessToken = tokens.accessToken;
      await supabase
        .from("linked_accounts")
        .update({ refresh_token: tokens.refreshToken })
        .eq("id", accountId);
      console.log("[deleteLinkCalEvents.ts] Microsoft token refreshed");
    } else {
      throw new Error("Unsupported provider");
    }
  } catch (error) {
    console.error("[deleteLinkCalEvents.ts] Token refresh failed:", error);
    throw new Error("Failed to refresh access token");
  }

  console.log(
    `[deleteLinkCalEvents.ts] Starting deletion for ${account.provider} calendar...`
  );
  try {
    if (account.provider === "google") {
      await deleteGoogleCalendarEvents(accessToken);
    } else if (["azure-ad", "microsoft"].includes(account.provider)) {
      await deleteMicrosoftCalendarEvents(accessToken);
    }
    console.log(
      "[deleteLinkCalEvents.ts] Deletion process completed successfully"
    );
  } catch (error) {
    console.error("[deleteLinkCalEvents.ts] Deletion process failed:", error);
    throw error;
  }
}

async function deleteGoogleCalendarEvents(accessToken: string) {
  console.log(
    "[deleteLinkCalEvents.ts] Starting Google Calendar events deletion process..."
  );
  let totalDeleted = 0;
  let totalProcessed = 0;
  let nextPageToken: string | undefined = undefined;

  do {
    console.log(
      "[deleteLinkCalEvents.ts] Fetching batch of Google Calendar events..."
    );
    const response: AxiosResponse<GoogleCalendarEventResponse> =
      await axios.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            q: "Linkcal",
            maxResults: 2500,
            showDeleted: false,
            singleEvents: true,
            orderBy: "startTime",
            pageToken: nextPageToken,
          },
        }
      );

    const events = response.data.items || [];
    console.log(
      `[deleteLinkCalEvents.ts] Found ${events.length} events in current batch`
    );
    totalProcessed += events.length;

    for (const event of events) {
      if (event.summary && event.summary.toLowerCase().includes("linkcal")) {
        console.log(
          `[deleteLinkCalEvents.ts] Deleting event: "${event.summary}" (ID: ${event.id})`
        );
        try {
          await axios.delete(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          totalDeleted++;
          console.log(
            `[deleteLinkCalEvents.ts] Successfully deleted event: "${event.summary}"`
          );
        } catch (error) {
          console.error(
            `[deleteLinkCalEvents.ts] Failed to delete event: "${event.summary}"`,
            error
          );
        }
      } else {
        console.log(
          `[deleteLinkCalEvents.ts] Skipping event: "${event.summary}" (doesn't contain "linkcal")`
        );
      }
    }

    nextPageToken = response.data.nextPageToken;
    console.log(
      `[deleteLinkCalEvents.ts] Batch complete. Next page token: ${
        nextPageToken ? "Yes" : "No"
      }`
    );
  } while (nextPageToken);

  console.log(
    `[deleteLinkCalEvents.ts] Google Calendar deletion complete: - Total events processed: ${totalProcessed} - Total events deleted: ${totalDeleted}`
  );
}

async function deleteMicrosoftCalendarEvents(accessToken: string) {
  console.log(
    "[deleteLinkCalEvents.ts] Starting Microsoft Calendar events deletion process..."
  );
  let totalDeleted = 0;
  let totalProcessed = 0;
  let nextLink: string | undefined = undefined;

  do {
    console.log(
      "[deleteLinkCalEvents.ts] Fetching batch of Microsoft Calendar events..."
    );
    const response: AxiosResponse<MicrosoftEventResponse> = await axios.get(
      nextLink || "https://graph.microsoft.com/v1.0/me/events",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          $filter: "contains(subject, 'linkcal')",
          $top: 100,
        },
      }
    );

    const events = response.data.value || [];
    console.log(
      `[deleteLinkCalEvents.ts] Found ${events.length} events in current batch`
    );
    totalProcessed += events.length;

    for (const event of events) {
      if (event.subject && event.subject.toLowerCase().includes("linkcal")) {
        console.log(
          `[deleteLinkCalEvents.ts] Deleting event: "${event.subject}" (ID: ${event.id})`
        );
        try {
          await axios.delete(
            `https://graph.microsoft.com/v1.0/me/events/${event.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          totalDeleted++;
          console.log(
            `[deleteLinkCalEvents.ts] Successfully deleted event: "${event.subject}"`
          );
        } catch (error) {
          console.error(
            `[deleteLinkCalEvents.ts] Failed to delete event: "${event.subject}"`,
            error
          );
        }
      } else {
        console.log(
          `[deleteLinkCalEvents.ts] Skipping event: "${event.subject}" (doesn't contain "linkcal")`
        );
      }
    }

    nextLink = response.data["@odata.nextLink"];
    console.log(
      `[deleteLinkCalEvents.ts] Batch complete. Next page: ${
        nextLink ? "Yes" : "No"
      }`
    );
  } while (nextLink);

  console.log(
    `[deleteLinkCalEvents.ts] Microsoft Calendar deletion complete: - Total events processed: ${totalProcessed} - Total events deleted: ${totalDeleted}`
  );
}

export async function deleteAccount(accountId: string) {
  try {
    console.log(
      "[deleteLinkCalEvents.ts] Starting account deletion process..."
    );
    await deleteLinkCalEvents(accountId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("linked_accounts")
      .delete()
      .eq("id", accountId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[deleteLinkCalEvents.ts] Deletion failed:", error);
    throw error;
  }
}
