"use server";

import { createClient } from "@/utils/supabase/server";
import axios, { AxiosError } from "axios";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refreshes the Google access token.
 * If the token refresh fails, a detailed error is logged and thrown.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from Google.");
    }

    return {
      accessToken,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    let errorMessage = "Failed to refresh Google token";
    if (axios.isAxiosError(error)) {
      errorMessage += `: ${error.response?.data?.error || error.message}`;
    } else if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    console.error("[refreshGoogleToken]", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Refreshes the Microsoft access token.
 * If the token refresh fails, a detailed error is logged and thrown.
 */
export async function refreshMicrosoftToken(
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from Microsoft.");
    }

    return {
      accessToken,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    let errorMessage = "Failed to refresh Microsoft token";
    if (axios.isAxiosError(error)) {
      errorMessage += `: ${error.response?.data?.error || error.message}`;
    } else if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    console.error("[refreshMicrosoftToken]", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Refreshes and updates the token for a given account.
 * All errors are thrown with detailed information.
 */
export async function refreshAndUpdateToken(
  accountId: string,
  provider: string,
  currentRefreshToken: string
): Promise<string> {
  const supabase = await createClient();
  let tokens: TokenResponse;

  if (provider === "google") {
    tokens = await refreshGoogleToken(currentRefreshToken);
  } else if (["azure", "microsoft"].includes(provider)) {
    tokens = await refreshMicrosoftToken(currentRefreshToken);
  } else {
    console.error(`[refreshAndUpdateToken] Unsupported provider: ${provider}`);
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Update the refresh token in the database.
  const { error } = await supabase
    .from("linked_accounts")
    .update({ refresh_token: tokens.refreshToken })
    .eq("id", accountId);
  if (error) {
    console.error(
      "[refreshAndUpdateToken] Failed to update refresh token in database:",
      error.message
    );
    throw new Error(
      `Failed to update refresh token in database: ${error.message}`
    );
  }

  return tokens.accessToken;
}
