import { createClient } from "@/utils/supabase/server";
import type { Meeting } from "@/db/schema";

/**
 * Deletes meetings in the DB whose external_event_ids have been removed.
 *
 * @param supabase - Supabase client instance.
 * @param accountId - Linked account id.
 * @param deletionIds - Array of external_event_ids to delete.
 */
export async function deleteMeetings(
  supabase: any,
  accountId: string,
  deletionIds: string[]
) {
  const { error: deleteError, count } = await supabase
    .from("meetings")
    .delete()
    .in("external_event_id", deletionIds)
    .eq("linked_account_id", accountId);
  if (deleteError) {
    console.error("[dbOperations.ts] Delete error:", deleteError.message);
  } else {
    console.log("[dbOperations.ts] Deleted", count, "events");
  }
}

/**
 * Inserts new meeting records into the DB.
 *
 * @param supabase - Supabase client instance.
 * @param insertData - Array of meeting records to insert.
 */
export async function insertMeetings(supabase: any, insertData: any[]) {
  const { error } = await supabase.from("meetings").insert(insertData);
  if (error) {
    console.error("[dbOperations.ts] Insert error:", error.message);
  } else {
    console.log("[dbOperations.ts] Inserted", insertData.length, "events");
  }
}

/**
 * Updates changed meeting records in the DB.
 *
 * @param supabase - Supabase client instance.
 * @param accountId - Linked account id.
 * @param updateData - Array of meeting records to update.
 */
export async function updateMeetings(
  supabase: any,
  accountId: string,
  updateData: Meeting[]
) {
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
          `[dbOperations.ts] Update failed for ${data.external_event_id}:`,
          error
        );
        return { success: false, id: data.external_event_id };
      }
    })
  );
  const successCount = results.filter((r) => r.success).length;
  console.log(
    "[dbOperations.ts] Updated",
    successCount,
    "/",
    updateData.length,
    "events successfully"
  );
}

/**
 * Updates the last_synced timestamp for the linked account once the sync is complete.
 *
 * @param supabase - Supabase client instance.
 * @param accountId - Linked account id.
 */
export async function updateLastSynced(supabase: any, accountId: string) {
  const { error: updateError } = await supabase
    .from("linked_accounts")
    .update({ last_synced: new Date() })
    .eq("id", accountId);
  if (updateError) {
    console.error(
      "[dbOperations.ts] Failed to update last_synced timestamp:",
      updateError.message
    );
  } else {
    console.log("[dbOperations.ts] last_synced timestamp updated.");
  }
}
