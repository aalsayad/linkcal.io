"use server";

import { createClient } from "@/utils/supabase/server";
import axios from "axios";

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.AUTH_GOOGLE_ID,
      client_secret: process.env.AUTH_GOOGLE_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing Google token:", (error as Error).message);
    throw new Error("Failed to refresh Google token");
  }
}

export async function refreshMicrosoftToken(
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.AUTH_AZURE_AD_ID || "",
        client_secret: process.env.AUTH_AZURE_AD_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error(
      "Error refreshing Microsoft token:",
      (error as Error).message
    );
    throw new Error("Failed to refresh Microsoft token");
  }
}

export async function refreshAndUpdateToken(
  accountId: string,
  provider: string,
  currentRefreshToken: string
): Promise<string> {
  const supabase = await createClient();
  let tokens: TokenResponse;

  if (provider === "google") {
    tokens = await refreshGoogleToken(currentRefreshToken);
  } else if (["azure-ad", "microsoft"].includes(provider)) {
    tokens = await refreshMicrosoftToken(currentRefreshToken);
  } else {
    throw new Error("Unsupported provider");
  }

  // Update refresh token in database
  await supabase
    .from("linked_accounts")
    .update({ refresh_token: tokens.refreshToken })
    .eq("id", accountId);

  return tokens.accessToken;
}
