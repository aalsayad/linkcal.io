"use client";

import LinkAccounts from "@/components/LinkAccounts";

export default function HomePage() {
  return (
    <>
      {/* Div Screen */}
      <div className="w-full h-screen min-h-screen">
        {/* Container Div */}
        <div className="w-full max-w-[1300px] h-full mx-auto border-r-[1px] border-l-[1px] border-overlay-10">
          <div className="h-14"></div>
          <div className="p-8">
            <LinkAccounts />
          </div>
        </div>
      </div>
    </>
  );
}
