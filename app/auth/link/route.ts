import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  // Debugging logs
  console.log("Starting the account linking process...");

  //Get Session Details from Auth.JS
  try {
    //Get supabase active session
    const supabase = await createClient();

    // Get the authenticated Supabase user
    const {
      data: { user },
      error: supabaseError,
    } = await supabase.auth.getUser();

    if (supabaseError || !user) {
      console.error("Error getting Supabase user:", supabaseError);
      return NextResponse.redirect("/login");
    }

    console.log("Supabase user:", user);

    // Retrieve the session using the auth function
    const session = await auth();

    if (!session) {
      console.error("No session found.");
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    console.log("Session details:", session);

    if (!session) {
      console.error("No NextAuth session found.");
      return NextResponse.redirect("/");
    }

    console.log("NextAuth session:", session);
  } catch (error) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
