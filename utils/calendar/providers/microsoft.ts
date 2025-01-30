import axios from "axios";
import { oneMonthAgo, threeMonthsAhead } from "../dates";
import { Meeting } from "@/db/schema";
import { filterOutLinkcalTimeblocks } from "../validation";

export const fetchMicrosoftEvents = async (
  accessToken: string
): Promise<any[]> => {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendarView",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
        params: {
          startDateTime: oneMonthAgo(),
          endDateTime: threeMonthsAhead(),
          $top: 9999,
          $select:
            "id,subject,start,end,attendees,location,onlineMeeting,bodyPreview,showAs,responseStatus",
        },
      }
    );
    return filterOutLinkcalTimeblocks(response.data.value || []);
  } catch (error) {
    throw new Error(
      `Microsoft Calendar fetch failed: ${(error as Error).message}`
    );
  }
};

export const normalizeMicrosoftEvents = (
  events: any[],
  linked_account_id: string
): Omit<Meeting, "user_id" | "created_at" | "updated_at">[] => {
  return events.map((event) => ({
    id: event.id,
    linked_account_id,
    external_event_id: event.id,
    provider: "microsoft",
    name: event.subject || "No title",
    start_date: `${event.start?.dateTime}Z`,
    end_date: `${event.end?.dateTime}Z`,
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
};
