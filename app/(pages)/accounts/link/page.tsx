"use client";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function LinkAccounts() {
  const searchParams = useSearchParams();
  const providerParam = searchParams.get("provider");
  const { data: session } = useSession();

  // When success=1 is present, store auth info along with a timestamp to localStorage.
  // Then sign out the user (without redirect) and close the window.
  useEffect(() => {
    if (searchParams.get("success") === "1" && session) {
      const refreshToken = (session as any).refreshToken; // adapt to your session structure
      const email = session.user.email;
      const provider = (session.user as any).provider;
      const accountData = {
        refreshToken,
        email,
        provider,
        timestamp: Date.now(),
      };
      localStorage.setItem("tempLinkedAccount", JSON.stringify(accountData));
      console.log("Saved account data to localStorage", accountData);

      // Sign out without redirect then close the window.
      signOut({ redirect: false }).then(() => {
        window.close();
      });
    }
  }, [searchParams, session]);

  // If a provider is provided in the query, initiate the signin process.
  useEffect(() => {
    if (providerParam) {
      const callbackUrl =
        window.location.origin + window.location.pathname + "?success=1";
      signIn(providerParam, { callbackUrl });
    }
  }, [providerParam]);

  return (
    <div className="z-[9999] bg-black h-screen w-screen fixed top-0 left-0 flex items-center justify-center">
      <ArrowPathIcon className="w-4 h-4 opacity-50 animate-spin" />
    </div>
  );
}
