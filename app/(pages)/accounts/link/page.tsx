"use client";

/**
 * This page is designed to be opened in a popup to handle the OAuth dance
 * with Google or Microsoft (Azure). We'll parse the `provider` from the
 * query string, build the proper OAuth URL, redirect to the provider,
 * and then, once we get back the `code`, we'll exchange it for tokens.
 */

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

/**
 * buildOAuthUrl: Constructs the Google or Microsoft OAuth 2.0 URL.
 * - provider: "google" or "azure"
 * - state: An optional JSON-encoded string to help maintain state between requests
 *
 * NOTE: Make sure your environment variables are set in .env (and exposed where necessary).
 */
function buildOAuthUrl(provider: "google" | "azure", state: string): string {
  if (provider === "google") {
    // Request offline access for a refresh token (access_type=offline + prompt=consent)
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? "",
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "azure") {
    // For Microsoft Graph Calendars, consider "Calendars.ReadWrite" in the scope
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? "",
      redirect_uri: process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI ?? "",
      response_type: "code",
      response_mode: "query",
      scope:
        "openid email profile offline_access https://graph.microsoft.com/Calendars.ReadWrite",
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Fallback if provider is unknown
  return "/";
}

export default function OAuthPopupPage() {
  // We'll read query parameters from the URL:
  // - `provider`: which provider was requested ("google" or "azure")
  // - `code`: the authorization code returned by the provider
  // - `state`: a JSON string that may include additional info
  const searchParams = useSearchParams();
  const providerParam = searchParams.get("provider");
  const codeParam = searchParams.get("code");
  const stateParam = searchParams.get("state");

  // We'll track our internal status to know what to show in the UI
  const [status, setStatus] = useState<
    "init" | "redirecting" | "exchanging" | "success" | "error"
  >("init");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // If we do NOT have a code yet, but we DO have a provider, we start the OAuth flow by redirecting.
    // This means the user just opened this popup from the main app with `?provider=google` or `?provider=azure`.
    if (!codeParam && providerParam) {
      setStatus("redirecting");
      // Build state object with whichever data you might need
      const stateObj = { provider: providerParam };
      const oauthUrl = buildOAuthUrl(
        providerParam as "google" | "azure",
        JSON.stringify(stateObj)
      );
      window.location.href = oauthUrl;
      return;
    }

    // If we DO have a code, that means the provider just redirected us back to the callback in the same popup.
    // Time to exchange the code for tokens on our server side.
    if (codeParam) {
      setStatus("exchanging");

      // First figure out which provider was used from the state param.
      let providerFromState: "google" | "azure" | null = null;
      if (stateParam) {
        try {
          const parsed = JSON.parse(stateParam);
          providerFromState = parsed.provider;
        } catch (err) {
          console.error("Error parsing state:", err);
        }
      }

      // If we didn't parse a valid provider, fallback to what's in the query param (if any)
      const finalProvider =
        providerFromState ?? (providerParam as "google" | "azure" | null);

      if (!finalProvider) {
        setStatus("error");
        setErrorMessage("No valid provider in URL or state.");
        return;
      }

      // POST to our backend exchange endpoint with the code and provider
      axios
        .post("/api/oauth/exchange", {
          code: codeParam,
          provider: finalProvider,
        })
        .then((res) => {
          console.log("res", res);
          if (res.data.success) {
            console.log("res.data", res.data);
            const { refreshToken, email, accountName } = res.data;

            // Save it in localStorage so the main window can read it
            // (We can name it "tempLinkedAccount" or any key we want)
            const accountData = {
              refreshToken,
              email,
              provider: finalProvider,
              accountName: accountName ?? email,
              timestamp: Date.now(),
            };

            localStorage.setItem(
              "tempLinkedAccount",
              JSON.stringify(accountData)
            );
            setStatus("success");

            // Optionally, close the popup automatically after a small delay
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            setStatus("error");
            setErrorMessage(
              res.data.error || "Unknown error in exchange response"
            );
          }
        })
        .catch((exchangeErr) => {
          console.error("Exchange error:", exchangeErr);
          setStatus("error");
          setErrorMessage("Error exchanging code. Check console for details.");
        });
    }
  }, [providerParam, codeParam, stateParam]);

  // Render minimal UI, since this is a popup.
  // We display different messages depending on the `status`.
  return (
    <div
      className="bg-black fixed top-0 left-0 text-white h-screen w-screen flex flex-col items-center justify-center text-center"
      style={{ zIndex: 9999 }}
    >
      {status === "init" && <p className="p-4">Initializing OAuth popup...</p>}

      {status === "redirecting" && (
        <p className="p-4">Redirecting to the OAuth provider...</p>
      )}

      {status === "exchanging" && (
        <p className="p-4">Exchanging authorization code for tokens...</p>
      )}

      {status === "success" && (
        <p className="p-4">OAuth success! You can close this window.</p>
      )}

      {status === "error" && (
        <div className="p-4">
          <p className="mb-2">OAuth error occurred.</p>
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
