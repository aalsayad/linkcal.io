// utils/linkAccount.ts
import { createClient } from "@/utils/supabase/client";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";
import { subscribeToGoogleCalendar } from "@/utils/calendar/googleCalendar/subscribeToGoogleCalendar";
import { refreshGoogleToken } from "@/utils/tokenRefresh";
import { refreshMicrosoftToken } from "@/utils/tokenRefresh";
import { subscribeToMicrosoftCalendar } from "@/utils/calendar/windowsCalendar/subscribeToMicrosoftCalendar";
import { v4 as uuidv4 } from "uuid";

export type AuthData = {
  provider: string;
  email: string;
  refreshToken: string;
};

export async function linkAccount(
  authData: AuthData | null,
  accountName: string,
  selectedColor: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated. Please log in.");
  }

  // Check if an account with the same email is already linked for this user.
  const { data: existingAccounts, error: fetchError } = await supabase
    .from("linked_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("email", authData?.email);

  if (fetchError) {
    throw new Error(
      "Error checking existing linked accounts: " + fetchError.message
    );
  }

  if (existingAccounts && existingAccounts.length > 0) {
    throw new Error("This account is already linked.");
  }

  // Generate a unique webhook channel id for subscription using uuidv4()
  const webhookChannelId = uuidv4();

  const newLink = {
    user_id: user.id,
    provider: authData?.provider,
    email: authData?.email,
    refresh_token: authData?.refreshToken,
    color: selectedColor,
    account_name: accountName,
    webhook_channel_id: webhookChannelId,
  };

  // Insert the new linked account and return the inserted row
  const { data, error } = await supabase
    .from("linked_accounts")
    .insert([newLink])
    .select();

  if (error || !data?.length) {
    throw new Error(
      "Error linking account: " + (error?.message || "Unknown error")
    );
  }

  const insertedAccount = data[0];
  console.log("[linkAccount.ts] Account linked successfully");

  // Fetch meetings using the newly linked account id and sync them to the database
  const validEvents = await fetchMeetings(insertedAccount.id);
  if (validEvents) {
    await syncMeetingsToDatabase(validEvents, insertedAccount.id, user.id);
    console.log("[linkAccount.ts] Initial meeting sync completed successfully");
  } else {
    console.log("[linkAccount.ts] No meetings fetched to sync.");
  }

  try {
    // We expect a valid refresh token for establishing the webhook subscription.
    if (!authData?.refreshToken) {
      throw new Error("Missing refresh token for webhook subscription.");
    }
    if (authData.provider === "google") {
      // Refresh the token to receive a valid access token.
      const tokens = await refreshGoogleToken(authData.refreshToken);
      // Pass the unique webhook_channel_id to the subscription function
      const subscriptionData = await subscribeToGoogleCalendar(
        tokens.accessToken,
        insertedAccount.webhook_channel_id
      );
      console.log(
        "[linkAccount.ts] Webhook subscription set up successfully.",
        subscriptionData
      );

      // Optionally, update the linked account with additional webhook subscription details:
      const { data: updatedData, error: updateError } = await supabase
        .from("linked_accounts")
        .update({
          webhook_resource_id: subscriptionData.resourceId,
          webhook_expiration: new Date(Number(subscriptionData.expiration)),
        })
        .eq("id", insertedAccount.id);
      if (updateError) {
        console.error(
          "[linkAccount.ts] Error updating linked account with subscription data:",
          updateError
        );
      } else {
        console.log(
          "[linkAccount.ts] Linked account updated with webhook subscription details:",
          updatedData
        );
      }
    } else if (
      authData.provider === "microsoft" ||
      authData.provider === "azure-ad" ||
      authData.provider === "azure"
    ) {
      // Refresh the token to receive a valid Microsoft access token.
      const tokens = await refreshMicrosoftToken(authData.refreshToken);
      // Subscribe to Microsoft Calendar webhook using the service channel id.
      const subscriptionData = await subscribeToMicrosoftCalendar(
        tokens.accessToken,
        insertedAccount.webhook_channel_id
      );
      console.log(
        "[linkAccount.ts] Microsoft webhook subscription set up successfully.",
        subscriptionData
      );

      // Optionally update the linked account with the Microsoft subscription details:
      const { data: updatedData, error: updateError } = await supabase
        .from("linked_accounts")
        .update({
          webhook_resource_id: subscriptionData.subscriptionId,
          webhook_expiration: new Date(subscriptionData.expirationDateTime),
        })
        .eq("id", insertedAccount.id)
        .select();
      if (updateError) {
        console.error(
          "[linkAccount.ts] Error updating linked account with Microsoft subscription data:",
          updateError
        );
      } else {
        console.log(
          "[linkAccount.ts] Linked account updated with Microsoft webhook subscription details:",
          updatedData
        );
      }
    } else {
      console.log(
        "[linkAccount.ts] Webhook subscription is not configured for provider:",
        authData.provider
      );
    }
  } catch (error) {
    console.error(
      "[linkAccount.ts] Failed to set up webhook subscription:",
      error
    );
  }

  return insertedAccount;
}
