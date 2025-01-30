"use client";

import Calendar from "@/components/Calendar";
import LinkAccounts from "@/components/LinkAccounts";
import LinkedAccounts from "@/components/LinkedAccounts";

export default function HomePage() {
  return (
    <>
      <LinkAccounts />
      <LinkedAccounts />
      <Calendar />
    </>
  );
}
