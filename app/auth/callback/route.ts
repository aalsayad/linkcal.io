import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";
import { linkAccount } from "@/utils/linkAccount";
import { createServiceClient } from "@/utils/supabase/serviceClient";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    console.error("No code present in callback");
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabaseServerClient = await createClient();
  // Exchange the authorization code for a session.
  const { data: sessionData, error: exchangeError } =
    await supabaseServerClient.auth.exchangeCodeForSession(code);
  if (!sessionData) {
    console.error("No session data found");
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
  if (exchangeError) {
    console.error("Exchange code error:", exchangeError);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  console.log("Session data:", sessionData);
  // Build the authData using session details.
  const supabaseServiceClient = createServiceClient();

  //Check if this user already has a linked account
  const { data: existingLink, error: existingLinkError } =
    await supabaseServiceClient
      .from("linked_accounts")
      .select("*")
      .eq("user_id", sessionData.user.id)
      .single();
  if (existingLinkError) {
    console.error("Error fetching existing link:", existingLinkError);
  }
  if (existingLink) {
    console.log("User already has a linked account:", existingLink);
  }

  //Prepare the linked_accounts table data
  const newLink = {
    user_id: sessionData.user.id,
    email: sessionData.user.email,
    provider:
      sessionData.user.app_metadata?.provider === "azure"
        ? "azure-ad"
        : sessionData.user.app_metadata?.provider || "unknown",
    refresh_token: sessionData.session.provider_refresh_token,
    color: "#FF6B6B",
    account_name:
      sessionData.user.app_metadata?.account_name || sessionData.user.email,
    webhook_channel_id: uuidv4(),
  };

  console.log("Creating new linked account:", newLink);
  try {
    // Pass in the needed data from the session to linkAccount.
    const { error } = await supabaseServiceClient
      .from("linked_accounts")
      .insert(newLink);
    if (error) {
      console.error("Error inserting new link:", error);
    } else {
      console.log("Account linked successfully.");
    }
  } catch (err) {
    console.error("Error linking account:", err);
  }

  //sync the user's meetings to the meetings table

  const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) {
    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}
