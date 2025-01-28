// app/actions/forwardMeetings.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import axios from "axios";
import {
  refreshGoogleToken,
  refreshMicrosoftToken,
} from "@/utils/tokenRefresh";

export async function forwardMeetings(
  sourceAccountId: string,
  targetAccountId: string
) {
  console.log("🚀 Starting meeting forwarding process...");
  console.log(`📤 Source Account: ${sourceAccountId}`);
  console.log(`📥 Target Account: ${targetAccountId}`);

  const supabase = await createClient();

  // Verify user authentication
  console.log("🔐 Verifying user authentication...");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("❌ Authentication failed:", authError);
    throw new Error("Authentication required");
  }
  console.log("✅ User authenticated:", user.id);

  // Get source account meetings
  console.log("📚 Fetching source account meetings...");
  const { data: sourceMeetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("*")
    .eq("linked_account_id", sourceAccountId)
    .eq("user_id", user.id);

  if (meetingsError || !sourceMeetings) {
    console.error("❌ Failed to fetch meetings:", meetingsError);
    throw new Error("Failed to get meetings");
  }
  console.log(`📊 Found ${sourceMeetings.length} meetings to process`);

  // Get target account details
  console.log("🎯 Fetching target account details...");
  const { data: targetAccount, error: accountError } = await supabase
    .from("linked_accounts")
    .select("*")
    .eq("id", targetAccountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !targetAccount) {
    console.error("❌ Invalid target account:", accountError);
    throw new Error("Invalid target account");
  }
  console.log(`✅ Target account found: ${targetAccount.provider}`);

  // Refresh target account token
  console.log("🔄 Refreshing target account token...");
  let accessToken: string;
  try {
    if (targetAccount.provider === "google") {
      const tokens = await refreshGoogleToken(targetAccount.refresh_token);
      accessToken = tokens.accessToken;
      await supabase
        .from("linked_accounts")
        .update({ refresh_token: tokens.refreshToken })
        .eq("id", targetAccountId);
      console.log("✅ Google token refreshed");
    } else if (["azure-ad", "microsoft"].includes(targetAccount.provider)) {
      const tokens = await refreshMicrosoftToken(targetAccount.refresh_token);
      accessToken = tokens.accessToken;
      await supabase
        .from("linked_accounts")
        .update({ refresh_token: tokens.refreshToken })
        .eq("id", targetAccountId);
      console.log("✅ Microsoft token refreshed");
    } else {
      throw new Error("Unsupported target provider");
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    throw new Error("Failed to refresh target account token");
  }

  // Function to forward a single meeting
  async function forwardMeeting(meeting: any): Promise<void> {
    console.log(`\n🔄 Processing meeting: "${meeting.name}"`);

    // Check if this meeting originated from the target account
    if (meeting.name.includes(`forwarded from ${targetAccountId}`)) {
      console.log(`⏭️ Meeting originated from target account, skipping...`);
      return;
    }

    // Format meeting details
    const meetingStart = new Date(meeting.date);
    const meetingEnd = new Date(new Date(meeting.date).getTime() + 3600000);
    const formattedStart = meetingStart.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedEnd = meetingEnd.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const meetingDetails = `Name: ${meeting.name}
Time: ${formattedStart} - ${formattedEnd}
Attendees: ${meeting.attendees?.join(", ") || "No attendees"}
${meeting.message ? `Body: ${meeting.message}\n` : ""}${
      meeting.link ? `Link: ${meeting.link}\n` : ""
    }
-----
Meeting forwarded by Linkcal.io`;

    console.log("📝 Formatted meeting details prepared");

    if (targetAccount.provider === "google") {
      const eventTitle = `Linkcal Timeblock | ${meeting.name}`;
      console.log("🔍 Checking for existing Google Calendar timeblock...");

      const existingEvents = await axios.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            q: eventTitle,
            timeMin: new Date(meeting.date).toISOString(),
            timeMax: new Date(
              new Date(meeting.date).getTime() + 86400000
            ).toISOString(),
            singleEvents: true,
          },
        }
      );

      if (existingEvents.data.items?.length > 0) {
        console.log("⏭️ Meeting already forwarded, skipping...");
        return;
      }

      console.log("📅 Creating new Google Calendar timeblock...");
      const timeBlock = {
        summary: eventTitle,
        description: meetingDetails,
        start: { dateTime: meetingStart.toISOString(), timeZone: "UTC" },
        end: { dateTime: meetingEnd.toISOString(), timeZone: "UTC" },
        transparency: "transparent",
        visibility: "private",
      };

      await axios.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        timeBlock,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Google Calendar timeblock created successfully");
    } else if (["azure-ad", "microsoft"].includes(targetAccount.provider)) {
      const eventTitle = `Linkcal Timeblock | ${meeting.name}`;
      console.log("🔍 Checking for existing Microsoft Calendar timeblock...");

      const existingEvents = await axios.get(
        "https://graph.microsoft.com/v1.0/me/events",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            $filter: `subject eq '${eventTitle}' and start/dateTime ge '${new Date(
              meeting.date
            ).toISOString()}'`,
            $top: 1,
          },
        }
      );

      if (existingEvents.data.value?.length > 0) {
        console.log("⏭️ Meeting already forwarded, skipping...");
        return;
      }

      console.log("📅 Creating new Microsoft Calendar timeblock...");
      const timeBlock = {
        subject: eventTitle,
        body: { contentType: "text", content: meetingDetails },
        start: { dateTime: meetingStart.toISOString(), timeZone: "UTC" },
        end: { dateTime: meetingEnd.toISOString(), timeZone: "UTC" },
        isAllDay: false,
        showAs: "free",
      };

      await axios.post(
        "https://graph.microsoft.com/v1.0/me/events",
        timeBlock,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      console.log("✅ Microsoft Calendar timeblock created successfully");
    }
  }

  // Add retry helper function
  async function forwardMeetingWithRetry(
    meeting: any,
    maxRetries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await forwardMeeting(meeting);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        console.log(`Retry attempt ${attempt} for meeting: ${meeting.name}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Helper functions
  function isRateLimitError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.status === 403 &&
        error.response?.data?.error?.code === 403 &&
        error.response?.data?.error?.message === "Rate Limit Exceeded"
      );
    }
    return false;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Forward meetings with retry mechanism
  console.log("\n🚀 Starting to forward meetings...");
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const meeting of sourceMeetings) {
    try {
      await forwardMeetingWithRetry(meeting);
      results.push({ success: true, meetingId: meeting.id });
      successCount++;
      console.log(`✅ Successfully forwarded meeting: ${meeting.name}`);
    } catch (error) {
      console.error(`❌ Failed to forward meeting: ${meeting.name}`, error);
      results.push({ success: false, meetingId: meeting.id });
      failureCount++;
    }
  }

  console.log(`\n🏁 Forwarding process complete:
  - Total meetings processed: ${sourceMeetings.length}
  - Successfully forwarded: ${successCount}
  - Failed to forward: ${failureCount}`);

  return { success: true, count: successCount };
}
