import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@/utils/supabase/server";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    AzureADProvider({
      authorization: {
        params: {
          scope:
            "openid profile email offline_access Calendars.ReadWrite Calendars.Read User.Read User.ReadBasic.All",
        },
      },
    }),
    GoogleProvider({
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
          access_type: "offline", // Request refresh token
          prompt: "consent", // Ensure consent screen is shown
        },
      },
    }),
  ],
  debug: true,
  events: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) {
        console.error("No account or profile information available.");
        return;
      }
      // Create Supabase client
      const supabase = await createClient();

      // Get the authenticated Supabase user
      const {
        data: { user: supabaseUser },
        error: supabaseError,
      } = await supabase.auth.getUser();

      if (supabaseError || !supabaseUser) {
        console.error("Error getting Supabase user:", supabaseError);
        return;
      }

      console.log("Checking if account already exists");
      console.log("User ID:", supabaseUser.id);
      console.log("Email:", profile.email);
      console.log("Provider:", account.provider);
      // Check if the account already exists
      const { data: existingAccount, error: fetchError } = await supabase
        .from("linked_accounts")
        .select("id")
        .eq("user_id", supabaseUser.id)
        .eq("email", profile.email)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error checking existing account:", fetchError);
        return;
      }

      if (existingAccount) {
        console.log("Account already linked, skipping insertion.");
        return;
      }

      // Insert into 'linked_accounts' table if not already linked
      const { error: insertError } = await supabase
        .from("linked_accounts")
        .insert([
          {
            user_id: supabaseUser.id,
            provider: account.provider,
            email: profile.email,
            refresh_token: account.refresh_token!,
          },
        ]);

      if (insertError) {
        console.error("Error inserting linked account:", insertError);
      } else {
        console.log("Linked account added successfully via event.");
      }
    },
  },
});
