import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/utils/supabase/serviceClient";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";

export async function POST(request: NextRequest) {
  try {
    // Handle potential Microsoft subscription validation.
    const url = new URL(request.url);
    if (url.searchParams.has("validationToken")) {
      const token = url.searchParams.get("validationToken");
      console.log(
        "[app/api/webhooks/calendar/route.ts] Microsoft subscription validation received:",
        token
      );
      return new NextResponse(token, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    let body = null;
    try {
      body = await request.json();
    } catch (e) {
      // Non-JSON bodies are ignored.
    }
    if (body && body.validationToken) {
      console.log(
        "[app/api/webhooks/calendar/route.ts] Microsoft subscription validation received in body:",
        body.validationToken
      );
      return new NextResponse(body.validationToken, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Process Google notifications.
    const googleChannelId = request.headers.get("x-goog-channel-id");
    if (googleChannelId) {
      console.log(
        "[app/api/webhooks/calendar/route.ts] Processing Google notification"
      );
      const supabase = createServiceClient();
      const { data: account, error } = await supabase
        .from("linked_accounts")
        .select("id, user_id, provider, refresh_token")
        .eq("webhook_channel_id", googleChannelId)
        .single();

      if (error || !account) {
        console.error(
          "[app/api/webhooks/calendar/route.ts] Linked account not found for Google channel:",
          googleChannelId,
          error
        );
        return NextResponse.json({
          success: true,
          message: "Linked account not found.",
        });
      }
      const events = await fetchMeetings(account.id, {
        id: account.id,
        provider: account.provider,
        refresh_token: account.refresh_token,
      });
      if (events !== null) {
        await syncMeetingsToDatabase(events, account.id, account.user_id);
        console.log(
          `[app/api/webhooks/calendar/route.ts] Processed sync for Google account ${account.id}`
        );
      } else {
        console.error(
          `[app/api/webhooks/calendar/route.ts] Failed to fetch meetings for Google account ${account.id}`
        );
      }
      return NextResponse.json({
        success: true,
        message: "Google webhook processed.",
      });
    }

    // Process Microsoft notifications.
    if (body && body.value && Array.isArray(body.value)) {
      console.log(
        "[app/api/webhooks/calendar/route.ts] Processing Microsoft notifications"
      );
      for (const notification of body.value) {
        const webhookChannelId = notification.clientState;
        console.log(
          "[app/api/webhooks/calendar/route.ts] Processing Microsoft notification for channel:",
          webhookChannelId
        );

        const supabase = createServiceClient();
        const { data: account, error } = await supabase
          .from("linked_accounts")
          .select("id, user_id, provider, refresh_token")
          .eq("webhook_channel_id", webhookChannelId)
          .single();

        if (error || !account) {
          console.error(
            "[app/api/webhooks/calendar/route.ts] Linked account not found for Microsoft channel:",
            webhookChannelId,
            error
          );
          continue;
        }
        const events = await fetchMeetings(account.id, {
          id: account.id,
          provider: account.provider,
          refresh_token: account.refresh_token,
        });
        if (events !== null) {
          await syncMeetingsToDatabase(events, account.id, account.user_id);
          console.log(
            `[app/api/webhooks/calendar/route.ts] Processed sync for Microsoft account ${account.id}`
          );
        } else {
          console.error(
            `[app/api/webhooks/calendar/route.ts] Failed to fetch meetings for Microsoft account ${account.id}`
          );
        }
      }
      return NextResponse.json({
        success: true,
        message: "Microsoft webhook processed.",
      });
    }

    console.log(
      "[app/api/webhooks/calendar/route.ts] No expected webhook headers or payloads found."
    );
    return NextResponse.json({
      success: true,
      message: "No action taken.",
    });
  } catch (error) {
    console.error(
      "[app/api/webhooks/calendar/route.ts] Error processing webhook:",
      error
    );
    return NextResponse.json({ success: false });
  }
}
