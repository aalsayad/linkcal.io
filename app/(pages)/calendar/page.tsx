"use client";
import React, { useEffect } from "react";
import Calendar from "@/components/Calendar";
import { syncAllLinkedAccounts } from "@/utils/meetings/periodicSync";

const CalendarPage = () => {
  useEffect(() => {
    // Run the sync on initial load.
    syncAllLinkedAccounts();

    // Schedule periodic syncing every 12 hours.
    const intervalId = setInterval(() => {
      syncAllLinkedAccounts();
    }, 12 * 60 * 60 * 1000); // 43200000 ms

    return () => clearInterval(intervalId);
  }, []);

  return <div>{/* <Calendar /> */}</div>;
};

export default CalendarPage;
