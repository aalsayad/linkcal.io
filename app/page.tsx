"use client";

import LinkAccounts from "@/components/LinkAccounts";
import LinkedAccounts from "@/components/LinkedAccounts";

export default function HomePage() {
  return (
    <>
      {/* Div Screen */}
      <div className="w-full h-screen min-h-screen px-4 md:px-8">
        {/* Container Div */}
        <div className="w-full max-w-[1300px] h-full mx-auto border-r-[1px] border-l-[1px] border-overlay-10">
          <div className="h-14"></div>
          <div className="p-4 md:p-8">
            <LinkAccounts />
            <LinkedAccounts />
          </div>
        </div>
      </div>
    </>
  );
}
