import type { Meeting } from "@/db/schema";

/**
 * Filters out events that appear to be created by Linkcal.
 * We exclude events whose name includes "linkcal" or "timeblock" or whose message contains
 * "meeting forwarded by linkcal.io".
 *
 * @param events - Array of incoming events that need to be synced.
 * @returns Filtered events with Linkcal-generated events excluded.
 */
export function filterLinkcalEvents(
  events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[]
): Omit<Meeting, "user_id" | "created_at" | "updated_at">[] {
  return events.filter((event) => {
    const isLinkcalEvent =
      event.name?.toLowerCase().includes("linkcal") ||
      event.name?.toLowerCase().includes("timeblock") ||
      event.message?.toLowerCase().includes("meeting forwarded by linkcal.io");

    if (isLinkcalEvent) {
      console.log(
        "[filterLinkCalEvents.ts] Filtering out Linkcal event:",
        event.name
      );
    }

    return !isLinkcalEvent;
  });
}
