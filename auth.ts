import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@/utils/supabase/server";
import { linkedAccounts } from "@/db/schema";
import type { InferInsertModel } from "drizzle-orm";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "./utils/meetings/syncMeetings";

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

      // Type the new linked account data
      type NewLinkedAccount = InferInsertModel<typeof linkedAccounts>;

      const newLinkedAccount: NewLinkedAccount = {
        user_id: supabaseUser.id,
        provider: account.provider,
        email: profile.email!,
        refresh_token: account.refresh_token!,
        // color is optional, so we can omit it
      };

      // Insert into 'linked_accounts' table if not already linked
      const { data: insertedAccount, error: insertError } = await supabase
        .from("linked_accounts")
        .insert([newLinkedAccount])
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting linked account:", insertError);
      } else if (insertedAccount) {
        console.log("Linked account added successfully via event.");

        try {
          // Fetch meetings from the provider
          const validEvents = await fetchMeetings(insertedAccount.id);

          if (validEvents) {
            // Sync them to the database
            await syncMeetingsToDatabase(
              validEvents,
              insertedAccount.id,
              supabaseUser.id
            );
            console.log("Initial meeting sync completed successfully");
          }
        } catch (syncError) {
          console.error("Error during initial meeting sync:", syncError);
        }
      }
    },
  },
});
