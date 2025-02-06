import type { Meeting } from "@/db/schema";

/**
 * Computes the new events (insert data) that must be added to the DB.
 *
 * It compares the deduplicated events to the existing meetings by matching event.id against
 * the DB's external_event_id.
 *
 * @param events - Deduplicated array of incoming events.
 * @param existingMeetings - Meetings already in the database.
 * @param accountId - Linked account id.
 * @param userId - User id.
 * @returns An array of meeting objects formatted for insertion.
 */
export function computeInsertData(
  events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[],
  existingMeetings: Partial<Meeting>[],
  accountId: string,
  userId: string
) {
  // console.log(events);
  // console.log(existingMeetings);
  // Convert both sides to string to ensure a proper comparison.
  const existingIds = new Set(
    existingMeetings.map((m) => String(m.external_event_id))
  );

  return events
    .filter((event) => !existingIds.has(String(event.id)))
    .map((event) => ({
      user_id: userId,
      linked_account_id: accountId,
      external_event_id: String(event.id),
      provider: event.provider,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      attendees: event.attendees,
      location: event.location,
      link: event.link,
      message: event.message,
      status: event.status,
    }));
}

/**
 * Computes the meeting records that already exist but have changed data.
 *
 * It compares each incoming event with its corresponding record in the DB.
 *
 * @param events - Deduplicated incoming events.
 * @param existingMeetings - Meetings already present in the database.
 * @param accountId - Linked account id.
 * @param userId - User id.
 * @returns An array of meeting objects formatted for update.
 */
export function computeUpdateData(
  events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[],
  existingMeetings: Partial<Meeting>[],
  accountId: string,
  userId: string
) {
  return events
    .filter((event) =>
      existingMeetings.some((m) => m.external_event_id === event.id)
    )
    .map((event): Meeting | null => {
      const existing = existingMeetings.find(
        (m) => m.external_event_id === event.id
      );
      if (!existing) return null;

      const newStartDate = event.start_date;
      const newEndDate = event.end_date;
      const existingStartDate = existing.start_date;
      const existingEndDate = existing.end_date;

      const hasChanges =
        existing.name !== event.name ||
        existingStartDate !== newStartDate ||
        existingEndDate !== newEndDate ||
        JSON.stringify(existing.attendees) !==
          JSON.stringify(event.attendees) ||
        existing.location !== event.location ||
        existing.link !== event.link ||
        existing.message !== event.message ||
        existing.status !== event.status;

      if (!hasChanges) return null;

      return {
        external_event_id: event.id,
        name: event.name,
        start_date: newStartDate,
        end_date: newEndDate,
        attendees: event.attendees,
        location: event.location,
        link: event.link,
        message: event.message,
        status: event.status,
        updated_at: new Date(),
        id: existing.id!, // carry over the DB id
        linked_account_id: accountId,
        user_id: userId,
        created_at: existing.created_at!,
        provider: event.provider,
      };
    })
    .filter((data): data is Meeting => data !== null);
}

/**
 * Determines which events should be deleted from the database because they are
 * no longer present in the incoming events.
 *
 * @param dedupedEvents - Deduplicated list of incoming events.
 * @param existingMeetings - List of meetings in the DB.
 * @returns Array of external event IDs to delete.
 */
export function computeDeletions(
  dedupedEvents: Omit<Meeting, "user_id" | "created_at" | "updated_at">[],
  existingMeetings: Partial<Meeting>[]
): string[] {
  return existingMeetings
    .filter(
      (meeting) =>
        !dedupedEvents.some((event) => event.id === meeting.external_event_id)
    )
    .map((meeting) => meeting.external_event_id)
    .filter((id): id is string => id !== undefined);
}
