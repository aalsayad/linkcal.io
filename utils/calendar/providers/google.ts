import axios from "axios";
import { oneMonthAgo, threeMonthsAhead } from "../dates";
import { Meeting } from "@/db/schema";
import { filterOutLinkcalTimeblocks } from "../validation";

export const fetchGoogleEvents = async (
  accessToken: string
): Promise<any[]> => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          singleEvents: "true",
          timeMin: oneMonthAgo(),
          timeMax: threeMonthsAhead(),
          timeZone: "UTC",
          fields:
            "items(id,status,summary,start,end,attendees,location,hangoutLink,description)",
        },
      }
    );
    return filterOutLinkcalTimeblocks(response.data.items || []);
  } catch (error) {
    throw new Error(
      `Google Calendar fetch failed: ${(error as Error).message}`
    );
  }
};

export const normalizeGoogleEvents = (
  events: any[],
  linked_account_id: string
): Omit<Meeting, "user_id" | "created_at" | "updated_at">[] => {
  return events.map((event) => ({
    id: event.id,
    linked_account_id,
    external_event_id: event.id,
    provider: "google",
    name: event.summary || "No title",
    start_date: event.start?.dateTime || event.start?.date,
    end_date: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map((att: any) => att.email) || [],
    location: event.location || "No location",
    link: event.hangoutLink || "No link",
    message: event.description || "No description",
    status: event.status || "confirmed",
  }));
};
