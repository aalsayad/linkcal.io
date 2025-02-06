"use client";

import Button from "@/components/Button";
import Image from "next/image";
import linkcalLogo from "@/public/linkcal.svg";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleOAuthLogin = async (provider: "google" | "azure") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
        scopes:
          provider === "azure"
            ? "email offline_access Calendars.ReadWrite Calendars.Read User.Read profile openid User.ReadBasic.All"
            : "email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        queryParams:
          provider === "google"
            ? {
                access_type: "offline",
                prompt: "consent",
              }
            : undefined,
      },
    });

    if (error) {
      console.log(error);
    } else {
      console.log(data);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-[400px] rounded-2xl bg-overlay-5 p-8 border border-overlay-10 backdrop-blur-lg flex items-center flex-col">
        <div className="text-center flex items-center flex-col">
          <Image alt="Linkcal Logo" className="w-[110px]" src={linkcalLogo} />
          <p className="mt-4 text-sm text-white/60 w-3/4">
            Securely sync and manage your calendars with Google
          </p>
        </div>

        <div className="w-full my-12 flex flex-col gap-4">
          <Button onClick={() => handleOAuthLogin("google")}>
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
            </svg>
            Continue with Google
          </Button>

          <Button onClick={() => handleOAuthLogin("azure")}>
            <svg
              className="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 23 23"
              fill="currentColor"
            >
              <path d="M0 0h11v11H0V0zm12 0h11v11H12V0zM0 12h11v11H0V12zm12 0h11v11H12V12z" />
            </svg>
            Continue with Microsoft
          </Button>
        </div>

        <p className="text-center text-[10px] text-white/20 w-3/4">
          By continuing, you agree to our Terms of Service and acknowledge that
          you have read our Privacy Policy
        </p>
      </div>
    </div>
  );
}
