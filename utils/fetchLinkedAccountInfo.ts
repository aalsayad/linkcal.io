"use server";
import { createClient } from "@/utils/supabase/server";
import axios from "axios";

// ==========================
// Utility for Date Ranges
// ==========================

/**
 * Returns an ISO string for 1 month in the past from now
 */
function oneMonthAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1); // 1 month back
  return date.toISOString();
}

/**
 * Returns an ISO string for 3 months in the future from now
 */
function threeMonthsAhead() {
  const date = new Date();
  date.setMonth(date.getMonth() + 3); // 3 months forward
  return date.toISOString();
}

// ==========================
// Token Refresh Functions
// ==========================
/**
 * Refresh Google access token using the provided refresh token.
 */
async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.AUTH_GOOGLE_ID,
      client_secret: process.env.AUTH_GOOGLE_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing Google token:", (error as Error).message);
    throw new Error("Failed to refresh Google token");
  }
}

/**
 * Refresh Microsoft access token using the provided refresh token.
 */
async function refreshMicrosoftToken(refreshToken: string) {
  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.AUTH_AZURE_AD_ID || "",
        client_secret: process.env.AUTH_AZURE_AD_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error(
      "Error refreshing Microsoft token:",
      (error as Error).message
    );
    throw new Error("Failed to refresh Microsoft token");
  }
}

// ==========================
// Calendar Fetch Functions
// ==========================
/**
 * Fetch expanded events from Google Calendar in [1 month ago, 3 months from now].
 * Removes artificial 'maxResults' limit so we don't miss events.
 */
async function fetchGoogleEvents(accessToken: string) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          singleEvents: "true", // Expand recurring
          timeMin: oneMonthAgo(), // 1 month back
          timeMax: threeMonthsAhead(), // 3 months forward
          orderBy: "startTime", // ascending by default
          fields:
            "items(id,status,summary,start,end,attendees,location,hangoutLink,description)",
        },
      }
    );

    const items = response.data.items || [];
    return items;
  } catch (error) {
    console.error(
      "Error fetching Google Calendar events:",
      (error as Error).message
    );
    throw new Error("Failed to fetch Google Calendar events");
  }
}

/**
 * Fetch events (including recurring expansions) from Microsoft Outlook Calendar
 * by querying the /calendarView endpoint with start and end datetimes.
 */
async function fetchMicrosoftEvents(accessToken: string) {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendarView",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          startDateTime: oneMonthAgo(), // 1 month back
          endDateTime: threeMonthsAhead(), // 3 months forward
          $orderby: "start/dateTime", // we omit this for now
          $top: 9999, // If you want a large limit
          $select:
            "id,subject,start,end,attendees,location,onlineMeeting,bodyPreview,showAs,responseStatus",
        },
      }
    );

    const items = response.data.value || [];
    return items;
  } catch (error) {
    console.error("Error fetching Microsoft events:", (error as Error).message);
    throw new Error("Failed to fetch Microsoft events");
  }
}

// ==========================
// Event Normalization
// ==========================
/**
 * Normalize Google Calendar events to a common format.
 * - Includes id, provider, name, date, attendees, location, link, message, status.
 */
function normalizeGoogleEvents(events: any[]) {
  return events.map((event) => ({
    name: event.summary || "No title",
    id: event.id, // the native Google event id
    provider: "google",
    date: event.start?.dateTime || event.start?.date || "No date",
    attendees: event.attendees?.map((att: any) => att.email) || [],
    location: event.location || "No location",
    link: event.hangoutLink || "No link",
    message: event.description || "No description",
    // Google events can have status = 'confirmed' | 'tentative' | 'cancelled'
    status: event.status || "confirmed",
  }));
}

/**
 * Normalize Microsoft Calendar events to a common format.
 * - Includes id, provider, name, date, attendees, location, link, message, status.
 */
function normalizeMicrosoftEvents(events: any[]) {
  return events.map((event) => ({
    name: event.subject || "No title",
    id: event.id, // the native Microsoft Graph event id
    provider: "microsoft",
    date: event.start?.dateTime || "No date",
    attendees:
      event.attendees?.map((att: any) => att.emailAddress?.address) || [],
    location:
      event.location?.displayName ||
      event.onlineMeeting?.joinUrl ||
      "No location",
    link: event.onlineMeeting?.joinUrl || "No link",
    message: event.bodyPreview || "No description",
    // 'showAs' might be 'free', 'busy', 'tentative', etc.
    // 'responseStatus' might be 'accepted', 'declined', 'tentativelyAccepted'...
    status: event.showAs || event.responseStatus?.response || "unknown",
  }));
}

// ==========================
// Main Function
// ==========================
/**
 * Fetch meetings/events for a given account (Google or Microsoft),
 * covering 1 month back to 3 months forward, including recurring events.
 *
 * @param accountId ID from 'linked_accounts' table
 * @param email The email address associated with this account
 * @returns Array of normalized events, each with { id, provider, name, date, ... } or null if error
 */
export async function fetchMeetings(accountId: string, email: string) {
  const supabase = await createClient();

  // 1. Get the logged-in user ID
  const userId = await supabase.auth.getUser().then((res) => res.data.user?.id);
  if (!userId) {
    console.error("No Supabase user is logged in.");
    return null;
  }

  // 2. Retrieve linked account details from the database
  const { data, error } = await supabase
    .from("linked_accounts")
    .select("provider, refresh_token")
    .eq("id", accountId)
    .eq("email", email)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    console.error("Error fetching linked account data:", error?.message);
    return null;
  }

  const { provider, refresh_token: refreshToken } = data;

  try {
    let accessToken;
    let newRefreshToken;
    let events;

    // 3. Refresh token and fetch events based on the provider
    if (provider === "google") {
      const tokens = await refreshGoogleToken(refreshToken);
      accessToken = tokens.accessToken;
      newRefreshToken = tokens.refreshToken;

      events = await fetchGoogleEvents(accessToken);
      events = normalizeGoogleEvents(events);
    } else if (provider === "azure-ad" || provider === "microsoft") {
      const tokens = await refreshMicrosoftToken(refreshToken);
      accessToken = tokens.accessToken;
      newRefreshToken = tokens.refreshToken;

      events = await fetchMicrosoftEvents(accessToken);
      events = normalizeMicrosoftEvents(events);
    } else {
      console.error(`Unsupported provider: ${provider}`);
      return null;
    }

    // 4. Update the refresh token in the database
    await supabase
      .from("linked_accounts")
      .update({ refresh_token: newRefreshToken })
      .eq("id", accountId)
      .eq("email", email)
      .eq("user_id", userId);

    // 5. Return the normalized events (no sorting applied here)
    return events;
  } catch (err) {
    console.error(
      "Error during token refresh or fetching events:",
      (err as Error).message
    );
    return null;
  }
}
