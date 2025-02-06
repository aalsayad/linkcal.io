import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 43200000 ms

export async function syncAllLinkedAccounts() {
  const now = Date.now();
  const lastSyncStr = localStorage.getItem("lastSyncTime");
  const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

  if (now - lastSync < TWELVE_HOURS_MS) {
    console.log(
      "[periodicSync.ts] Periodic sync skipped – last sync was less than 12 hours ago."
    );
    return;
  }

  console.log(
    "[periodicSync.ts] Starting periodic sync for all linked accounts..."
  );
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData || !userData.user) {
    console.error(
      "[periodicSync.ts] Error getting user for periodic sync:",
      userError
    );
    return;
  }

  const userId = userData.user.id;
  const linkedAccounts = await fetchLinkedAccounts(userId);
  if (!linkedAccounts || linkedAccounts.length === 0) {
    console.log("[periodicSync.ts] No linked accounts available for syncing.");
    localStorage.setItem("lastSyncTime", now.toString());
    return;
  }

  for (const account of linkedAccounts) {
    try {
      const meetings = await fetchMeetings(account.id);
      if (meetings && meetings.length > 0) {
        console.log(
          `[periodicSync.ts] Syncing meetings for account: ${account.email}`
        );
        await syncMeetingsToDatabase(meetings, account.id, userId);
      } else {
        console.log(
          `[periodicSync.ts] No meetings found for account: ${account.email}`
        );
      }
    } catch (error) {
      console.error(
        `[periodicSync.ts] Error syncing meetings for account ${account.email}:`,
        error
      );
    }
  }
  localStorage.setItem("lastSyncTime", now.toString());
  console.log("[periodicSync.ts] Periodic sync complete.");
}
