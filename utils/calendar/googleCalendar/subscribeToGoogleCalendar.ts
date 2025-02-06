import axios from "axios";

export async function subscribeToGoogleCalendar(
  accessToken: string,
  webhookChannelId: string
) {
  // Use your tunnel URL for the webhook endpoint.
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Missing NEXT_PUBLIC_WEBHOOK_URL environment variable.");
  }

  try {
    const response = await axios.post(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
      {
        id: webhookChannelId, // Use the provided webhookChannelId
        type: "web_hook",
        address: webhookUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Google Calendar subscription registered:", response.data);
    // response.data will contain properties such as resourceId and expiration as strings.
    return response.data;
  } catch (error) {
    console.error("Error subscribing to Google Calendar webhooks:", error);
    throw error;
  }
}
