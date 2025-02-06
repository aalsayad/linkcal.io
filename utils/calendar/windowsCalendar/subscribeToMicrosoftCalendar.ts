import axios from "axios";

export interface MicrosoftSubscriptionResponse {
  subscriptionId: string;
  expirationDateTime: string;
}

/**
 * Subscribes to Microsoft Calendar webhooks.
 *
 * @param accessToken - The valid Microsoft access token.
 * @param webhookChannelId - Our unique webhook channel id (used as clientState or for correlating the subscription).
 * @returns An object with subscription details such as subscriptionId and expirationDateTime.
 */
export async function subscribeToMicrosoftCalendar(
  accessToken: string,
  webhookChannelId: string
): Promise<MicrosoftSubscriptionResponse> {
  try {
    // The notification URL must be a publicly accessible HTTPS URL.
    // Make sure this environment variable is set in your deployment.
    const notificationUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
    console.log("notificationUrl", notificationUrl);
    if (!notificationUrl) {
      throw new Error("Missing NEXT_PUBLIC_WEBHOOK_URL environment variable.");
    }

    // For Microsoft Calendar subscriptions, the expiration date must be within allowed limits.
    // Adjusted here to 24 hours from now (instead of 70 hours).
    const expirationDateTime = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const requestBody = {
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: "/me/calendar/events", // Adjust the resource if needed.
      expirationDateTime,
      clientState: webhookChannelId,
    };

    console.log("[subscribeToMicrosoftCalendar] Request Body:", requestBody);

    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/subscriptions",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[subscribeToMicrosoftCalendar] Response:", response.data);

    const data = response.data;
    return {
      subscriptionId: data.id,
      expirationDateTime: data.expirationDateTime,
    };
  } catch (error) {
    console.error("Error subscribing to Microsoft Calendar:", error);
    throw new Error("Subscription to Microsoft Calendar failed.");
  }
}
