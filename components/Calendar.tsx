"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  CalendarIcon,
  ViewColumnsIcon,
  TableCellsIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";

type CalendarView = "month" | "week" | "day";

interface Meeting {
  id: string;
  name: string;
  date: string;
  linked_account_id: string;
}

interface LinkedAccount {
  id: string;
  email: string;
}

const Calendar = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Predefined colors for accounts
  const accountColors = [
    "border-l-blue-500",
    "border-l-green-500",
    "border-l-purple-500",
    "border-l-orange-500",
    "border-l-pink-500",
    "border-l-cyan-500",
    "border-l-yellow-500",
    "border-l-red-500",
  ];

  // Function to get color based on account index
  const getAccountColor = (accountId: string) => {
    const accountIndex = accounts.findIndex((a) => a.id === accountId);
    return accountIndex >= 0
      ? accountColors[accountIndex % accountColors.length]
      : "border-l-gray-500";
  };

  // Function to get background color for legend
  const getAccountBgColor = (accountId: string) => {
    return getAccountColor(accountId).replace("border-l-", "bg-");
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch accounts first
      const { data: accountsData } = await supabase
        .from("linked_accounts")
        .select("id, email")
        .eq("user_id", user.user.id);

      setAccounts(accountsData || []);

      // Then fetch meetings
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("id, name, date, linked_account_id")
        .eq("user_id", user.user.id)
        .gte("date", startOfMonth.toISOString())
        .lte("date", endOfMonth.toISOString())
        .order("date");

      setMeetings(meetingsData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(timer);
  }, []);

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours + minutes / 60) * 80; // 80px is the height of each hour slot
  };

  const getDaysInMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = new Date().toLocaleString("default", { month: "long" });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const formatHour = (hour: number) => {
    return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
  };

  const ViewToggle = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setView("month")}
        className={`p-2 rounded ${view === "month" ? "bg-overlay-10" : ""}`}
        title="Month view"
      >
        <TableCellsIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => setView("week")}
        className={`p-2 rounded ${view === "week" ? "bg-overlay-10" : ""}`}
        title="Week view"
      >
        <ViewColumnsIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => setView("day")}
        className={`p-2 rounded ${view === "day" ? "bg-overlay-10" : ""}`}
        title="Day view"
      >
        <CalendarIcon className="w-5 h-5" />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="mt-8 p-4 bg-overlay-5 rounded-lg h-[600px] flex items-center justify-center">
        <ArrowPathIcon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="mt-8 p-4 bg-overlay-5 rounded-lg h-[600px] flex flex-col items-center justify-center text-center">
        <CalendarIcon className="w-12 h-12 mb-4 text-white/40" />
        <h3 className="text-lg font-medium mb-2">No meetings found</h3>
        <p className="text-sm text-white/60">
          Sync your calendar to see your meetings here
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-overlay-5 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {selectedDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <ViewToggle />
      </div>

      <div className="min-h-[600px]">
        {view === "month" && (
          <MonthView
            meetings={meetings}
            selectedDate={selectedDate}
            getAccountColor={getAccountColor}
          />
        )}
        {view === "week" && (
          <WeekView
            meetings={meetings}
            selectedDate={selectedDate}
            getAccountColor={getAccountColor}
          />
        )}
        {view === "day" && (
          <DayView
            meetings={meetings}
            selectedDate={selectedDate}
            getAccountColor={getAccountColor}
          />
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-overlay-10">
        <div className="flex flex-wrap gap-4 text-xs">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${getAccountBgColor(
                  account.id
                )}`}
              ></div>
              <span>{account.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
