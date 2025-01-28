"use server";
import { createClient } from "@/utils/supabase/server";
import axios from "axios";
import { refreshAndUpdateToken } from "@/utils/tokenRefresh";

// ==========================
// Utility for Date Ranges
// ==========================
function oneMonthAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString();
}

function threeMonthsAhead(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString();
}

// ==========================
// Calendar Fetch Functions
// ==========================
async function fetchGoogleEvents(accessToken: string): Promise<any[]> {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          singleEvents: "true",
          timeMin: oneMonthAgo(),
          timeMax: threeMonthsAhead(),
          fields:
            "items(id,status,summary,start,end,attendees,location,hangoutLink,description)",
        },
      }
    );
    const filteredEvents = (response.data.items || []).filter(
      (event: any) => !event.summary?.includes("TimeBlock")
    );
    console.log(
      "🔍 [DEBUG] Fetched Google events:",
      response.data.items?.length
    );
    console.log("🔍 [DEBUG] After TimeBlock filter:", filteredEvents.length);
    return filteredEvents;
  } catch (error) {
    console.error(
      "Error fetching Google Calendar events:",
      (error as Error).message
    );
    throw new Error("Failed to fetch Google Calendar events");
  }
}

async function fetchMicrosoftEvents(accessToken: string): Promise<any[]> {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendarView",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          startDateTime: oneMonthAgo(),
          endDateTime: threeMonthsAhead(),
          $top: 9999,
          $select:
            "id,subject,start,end,attendees,location,onlineMeeting,bodyPreview,showAs,responseStatus",
        },
      }
    );
    const filteredEvents = (response.data.value || []).filter(
      (event: any) => !event.subject?.includes("TimeBlock")
    );
    console.log(
      "🔍 [DEBUG] Fetched Microsoft events:",
      response.data.value?.length
    );
    console.log("🔍 [DEBUG] After TimeBlock filter:", filteredEvents.length);
    return filteredEvents;
  } catch (error) {
    console.error("Error fetching Microsoft events:", (error as Error).message);
    throw new Error("Failed to fetch Microsoft events");
  }
}

// ==========================
// Event Normalization
// ==========================
export interface NormalizedEvent {
  id: string;
  provider: string;
  name: string;
  date: string;
  attendees: string[];
  location: string;
  link: string;
  message: string;
  status: string;
}

function normalizeGoogleEvents(events: any[]): NormalizedEvent[] {
  console.log("🔍 [DEBUG] Normalizing Google events, count:", events.length);
  const normalized = events
    .filter((event) => {
      const isTimeBlock = event.summary?.includes("TimeBlock");
      if (isTimeBlock) {
        console.log("🔍 [DEBUG] Filtering out TimeBlock event:", event.summary);
      }
      return !isTimeBlock;
    })
    .map((event) => ({
      id: event.id,
      provider: "google",
      name: event.summary || "No title",
      date: event.start?.dateTime || event.start?.date,
      attendees: event.attendees?.map((att: any) => att.email) || [],
      location: event.location || "No location",
      link: event.hangoutLink || "No link",
      message: event.description || "No description",
      status: event.status || "confirmed",
    }));
  console.log("🔍 [DEBUG] After normalization:", normalized.length);
  return normalized;
}

function normalizeMicrosoftEvents(events: any[]): NormalizedEvent[] {
  console.log("🔍 [DEBUG] Normalizing Microsoft events, count:", events.length);
  const normalized = events
    .filter((event) => {
      const isTimeBlock = event.subject?.includes("TimeBlock");
      if (isTimeBlock) {
        console.log("🔍 [DEBUG] Filtering out TimeBlock event:", event.subject);
      }
      return !isTimeBlock;
    })
    .map((event) => ({
      id: event.id,
      provider: "microsoft",
      name: event.subject || "No title",
      date: event.start?.dateTime,
      attendees:
        event.attendees?.map((att: any) => att.emailAddress?.address) || [],
      location:
        event.location?.displayName ||
        event.onlineMeeting?.joinUrl ||
        "No location",
      link: event.onlineMeeting?.joinUrl || "No link",
      message: event.bodyPreview || "No description",
      status: event.showAs || event.responseStatus?.response || "unknown",
    }));
  console.log("🔍 [DEBUG] After normalization:", normalized.length);
  return normalized;
}

// ==========================
// Main Function
// ==========================
export async function fetchMeetings(
  accountId: string,
  email: string
): Promise<NormalizedEvent[] | null> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    console.error("Authentication error:", authError?.message);
    return null;
  }

  // Get linked account details
  const { data: account, error: accountError } = await supabase
    .from("linked_accounts")
    .select("provider, refresh_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    console.error("Account error:", accountError?.message);
    return null;
  }

  try {
    // Refresh token and fetch events
    const accessToken = await refreshAndUpdateToken(
      accountId,
      account.provider,
      account.refresh_token
    );
    let events: NormalizedEvent[];

    if (account.provider === "google") {
      events = normalizeGoogleEvents(await fetchGoogleEvents(accessToken));
    } else if (["azure-ad", "microsoft"].includes(account.provider)) {
      events = normalizeMicrosoftEvents(
        await fetchMicrosoftEvents(accessToken)
      );
    } else {
      throw new Error("Unsupported provider");
    }

    // Filter valid events with proper dates
    const validEvents = events.filter((event) => {
      try {
        return !isNaN(new Date(event.date).getTime());
      } catch {
        return false;
      }
    });

    console.log("🔵 [FETCH] Total valid events:", validEvents.length);
    return validEvents;
  } catch (error) {
    console.error("🔴 [FETCH] Critical error:", (error as Error).message);
    return null;
  }
}
