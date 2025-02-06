import axios from "axios";

/**
 * Stops a Google Calendar watch channel.
 *
 * @param accessToken - The valid Google access token.
 * @param webhookChannelId - The channel ID you previously sent to Google.
 * @param webhookResourceId - The resource ID returned by Google upon subscription.
 */
export async function stopGoogleCalendarWatch(
  accessToken: string,
  webhookChannelId: string,
  webhookResourceId: string
) {
  const url = "https://www.googleapis.com/calendar/v3/channels/stop";

  try {
    const response = await axios.post(
      url,
      {
        id: webhookChannelId,
        resourceId: webhookResourceId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(
      "Successfully stopped channel:",
      webhookChannelId,
      response.data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error stopping channel:", error.response?.data || error);
    throw error;
  }
}
