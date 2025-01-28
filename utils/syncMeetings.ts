"use server";
import { createClient } from "@/utils/supabase/server";
import { NormalizedEvent } from "./fetchLinkedAccountInfo";

interface MeetingUpdate {
  external_event_id: string;
  name: string;
  date: string;
  attendees: string[];
  location: string;
  link: string;
  message: string;
  status: string;
  updated_at: string;
}

export async function syncMeetingsToDatabase(
  validEvents: NormalizedEvent[],
  accountId: string,
  userId: string
) {
  console.log("🔄 Starting database sync...");

  // Filter out Linkcal events first
  const nonLinkcalEvents = validEvents.filter((event) => {
    const isLinkcalEvent =
      event.name.toLowerCase().includes("linkcal") ||
      event.name.toLowerCase().includes("timeblock") ||
      event.message.toLowerCase().includes("meeting forwarded by linkcal.io");

    if (isLinkcalEvent) {
      console.log("🔍 [SYNC] Filtering out Linkcal event:", event.name);
    }
    return !isLinkcalEvent;
  });

  console.log(
    `🔵 [SYNC] Filtered ${
      validEvents.length - nonLinkcalEvents.length
    } Linkcal events`
  );
  console.log(`🔵 [SYNC] Processing ${nonLinkcalEvents.length} regular events`);

  const supabase = await createClient();

  // Get existing meetings for comparison
  const { data: existingMeetings, error: fetchError } = await supabase
    .from("meetings")
    .select(
      "id, external_event_id, name, date, attendees, location, link, message, status"
    )
    .eq("linked_account_id", accountId);

  if (fetchError) {
    console.error(
      "🔴 [SYNC] Error fetching existing meetings:",
      fetchError.message
    );
    return null;
  }

  // Rest of the sync logic now works with nonLinkcalEvents instead of validEvents
  const existingIds = new Set(
    existingMeetings?.map((m) => m.external_event_id)
  );
  const fetchedIds = new Set(nonLinkcalEvents.map((e) => e.id));
  const idsToDelete =
    existingMeetings
      ?.filter((m) => !fetchedIds.has(m.external_event_id))
      .map((m) => m.external_event_id) || [];

  // Prepare insert data (only for non-Linkcal events)
  const insertData = nonLinkcalEvents
    .filter((event) => !existingIds.has(event.id))
    .map((event) => ({
      user_id: userId,
      linked_account_id: accountId,
      external_event_id: event.id,
      provider: event.provider,
      name: event.name,
      date: new Date(event.date).toISOString(),
      attendees: event.attendees,
      location: event.location,
      link: event.link,
      message: event.message,
      status: event.status,
    }));

  // Prepare update data
  const updateData = nonLinkcalEvents
    .filter((event) => existingIds.has(event.id))
    .map((event): MeetingUpdate | null => {
      const existing = existingMeetings?.find(
        (m) => m.external_event_id === event.id
      );
      if (!existing) return null;

      const newDate = new Date(event.date).toISOString();
      const existingDate = existing.date;

      const hasChanges =
        existing.name !== event.name ||
        existingDate !== newDate ||
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
        date: newDate,
        attendees: event.attendees,
        location: event.location,
        link: event.link,
        message: event.message,
        status: event.status,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((d): d is MeetingUpdate => d !== null);

  console.log("🔵 [SYNC] Operations:", {
    insert: insertData.length,
    update: updateData.length,
    delete: idsToDelete.length,
  });

  try {
    // Delete removed events
    if (idsToDelete.length > 0) {
      const { error: deleteError, count } = await supabase
        .from("meetings")
        .delete()
        .in("external_event_id", idsToDelete)
        .eq("linked_account_id", accountId);

      if (deleteError) {
        console.error("🔴 [SYNC] Delete error:", deleteError.message);
      } else {
        console.log("🟢 [SYNC] Deleted", count, "events");
      }
    }

    // Insert new events
    if (insertData.length > 0) {
      const { error } = await supabase.from("meetings").insert(insertData);
      if (error) {
        console.error("🔴 [SYNC] Insert error:", error.message);
      } else {
        console.log("🟢 [SYNC] Inserted", insertData.length, "events");
      }
    }

    // Update changed events
    if (updateData.length > 0) {
      const results = await Promise.all(
        updateData.map(async (data) => {
          try {
            const { error } = await supabase
              .from("meetings")
              .update(data)
              .eq("external_event_id", data.external_event_id)
              .eq("linked_account_id", accountId);
            return { success: !error, id: data.external_event_id };
          } catch (error) {
            console.error(
              `Update failed for ${data.external_event_id}:`,
              error
            );
            return { success: false, id: data.external_event_id };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      console.log(
        "🟢 [SYNC] Updated",
        successCount,
        "/",
        updateData.length,
        "events successfully"
      );
    }

    console.log("🟢 [SYNC] Synchronization complete");
    return nonLinkcalEvents;
  } catch (error) {
    console.error("🔴 [SYNC] Sync error:", error);
    return null;
  }
}
