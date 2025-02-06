import { NextResponse } from "next/server";
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

    // Continue with any linking logic you previously had.
    // For example, if you need to pass additional session details,
    // you can work with the user object returned by supabase.auth.getUser().

    return NextResponse.json({
      success: true,
      message: "User authenticated via Supabase!",
    });
  } catch (error) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
