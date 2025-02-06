import type { Meeting } from "@/db/schema";

/**
 * Removes duplicate events by creating a Map keyed by the event id.
 *
 * @param events - Array of (filtered) events.
 * @returns A deduplicated array of events.
 */
export function deduplicateEvents(
  events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[]
): Omit<Meeting, "user_id" | "created_at" | "updated_at">[] {
  return Array.from(new Map(events.map((event) => [event.id, event])).values());
}
