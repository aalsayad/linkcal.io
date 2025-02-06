import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  // Parse the JSON body from the request
  const { code, provider } = await request.json();

  // Validate required parameters
  if (!code || !provider) {
    return NextResponse.json(
      { error: "Missing code or provider" },
      { status: 400 }
    );
  }

  try {
    if (provider === "google") {
      // Build the parameters for Google token exchange
      const params = new URLSearchParams();
      params.append("code", code);
      params.append("client_id", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!);
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET!);
      params.append(
        "redirect_uri",
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!
      );
      params.append("grant_type", "authorization_code");

      // Exchange code for tokens from Google
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      // Extract tokens from the response
      const refreshToken = tokenResponse.data.refresh_token;
      const accessToken = tokenResponse.data.access_token;

      // Fetch user information (email and name) using the access token
      const userInfoResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const email = userInfoResponse.data.email;
      const accountName = userInfoResponse.data.name || email;
      //   console.log("refreshToken", refreshToken);
      //   console.log("accessToken", accessToken);

      // Return the refresh token along with user info
      return NextResponse.json({
        success: true,
        refreshToken,
        email,
        accountName,
      });
    } else if (provider === "azure") {
      // Build the parameters for Microsoft token exchange
      const params = new URLSearchParams();
      params.append("code", code);
      params.append("client_id", process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!);
      params.append("client_secret", process.env.MICROSOFT_CLIENT_SECRET!);
      params.append(
        "redirect_uri",
        process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI!
      );
      params.append("grant_type", "authorization_code");

      // Exchange code for tokens from Microsoft
      const tokenResponse = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      // Extract tokens from the response
      const refreshToken = tokenResponse.data.refresh_token;
      const accessToken = tokenResponse.data.access_token;

      // Fetch user information using the Microsoft Graph API
      const userInfoResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      //   console.log("userInfoResponse", userInfoResponse);

      const email =
        userInfoResponse.data.mail || userInfoResponse.data.userPrincipalName;
      const accountName = userInfoResponse.data.displayName || email;
      //   console.log("refreshToken", refreshToken);
      //   console.log("accessToken", accessToken);

      // Return the refresh token along with user info
      return NextResponse.json({
        success: true,
        refreshToken,
        email,
        accountName,
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error(
      "Error in OAuth exchange:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      { error: "OAuth exchange failed" },
      { status: 500 }
    );
  }
}
