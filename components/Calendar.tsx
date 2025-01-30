import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useEffect } from "react";
import type { Meeting } from "@/db/schema";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  isToday,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  setHours,
  setMinutes,
  differenceInMinutes,
  isSameMonth,
} from "date-fns";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";

type CalendarView = "month" | "week" | "day";

const Calendar = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [linkedAccounts, setLinkedAccounts] = useState<{
    [key: string]: { email: string; color: string };
  }>({});

  useEffect(() => {
    async function fetchMeetings() {
      const supabase = createClient();

      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) return;

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("user_id", user.user.id);

      if (error) {
        console.error("Error fetching meetings:", error);
        return;
      }

      setMeetings(data || []);
      setLoading(false);
    }

    fetchMeetings();
  }, []);

  useEffect(() => {
    async function loadLinkedAccounts() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const accounts = await fetchLinkedAccounts(user.id);
      const accountMap = accounts.reduce(
        (acc, account) => ({
          ...acc,
          [account.id]: {
            email: account.email,
            color: account.color || "#ffffff",
          },
        }),
        {}
      );
      setLinkedAccounts(accountMap);
    }
    loadLinkedAccounts();
  }, []);

  // Navigation handlers
  const navigate = {
    next: () => {
      switch (view) {
        case "month":
          setCurrentDate(addMonths(currentDate, 1));
          break;
        case "week":
          setCurrentDate(addWeeks(currentDate, 1));
          break;
        case "day":
          setCurrentDate(addDays(currentDate, 1));
          break;
      }
    },
    prev: () => {
      switch (view) {
        case "month":
          setCurrentDate(subMonths(currentDate, 1));
          break;
        case "week":
          setCurrentDate(subWeeks(currentDate, 1));
          break;
        case "day":
          setCurrentDate(subDays(currentDate, 1));
          break;
      }
    },
    today: () => setCurrentDate(new Date()),
  };

  // Get dates based on current view
  const getDates = () => {
    switch (view) {
      case "month": {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const monthStart = startOfWeek(start, { weekStartsOn: 1 });
        const monthEnd = endOfWeek(end, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      }
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      }
      case "day":
        return [currentDate];
    }
  };

  const dates = getDates();

  // Get meetings for the selected date
  const selectedDateMeetings = selectedDate
    ? meetings.filter(
        (meeting) =>
          isSameDay(parseISO(meeting.start_date), selectedDate) ||
          isSameDay(parseISO(meeting.end_date), selectedDate)
      )
    : [];

  // Add these helper functions inside the Calendar component
  const getTimeBlockPosition = (time: string) => {
    const date = parseISO(time);
    const minutes = date.getHours() * 60 + date.getMinutes();
    // Calculate position relative to 6am (start time)
    const startMinutes = 6 * 60;
    return ((minutes - startMinutes) / (16 * 60)) * 100; // 16 hours total (6am-10pm)
  };

  const getTimeBlockHeight = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const diffMinutes = differenceInMinutes(end, start);
    return (diffMinutes / (16 * 60)) * 100; // 16 hours total
  };

  if (loading) {
    return <div className="mt-8 text-white/60">Loading calendar...</div>;
  }

  return (
    <div className="mt-8">
      <div className="bg-overlay-5 p-6 rounded-lg border border-overlay-10">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-4">
            {/* View Switcher */}
            <div className="flex rounded-md overflow-hidden">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`
                    px-3 py-1.5 text-sm capitalize
                    ${
                      view === v
                        ? "bg-overlay-20 text-white"
                        : "bg-overlay-10 text-white/60 hover:bg-overlay-15"
                    }
                  `}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={navigate.prev}
                className="px-3 py-1.5 rounded bg-overlay-10 hover:bg-overlay-20 transition-colors text-sm"
              >
                Previous
              </button>
              <button
                onClick={navigate.today}
                className="px-3 py-1.5 rounded bg-overlay-10 hover:bg-overlay-20 transition-colors text-sm"
              >
                Today
              </button>
              <button
                onClick={navigate.next}
                className="px-3 py-1.5 rounded bg-overlay-10 hover:bg-overlay-20 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className={`grid gap-1 ${
            view === "month"
              ? "grid-cols-7"
              : view === "week"
              ? "grid-cols-7"
              : "grid-cols-1"
          }`}
        >
          {/* Day headers */}
          {view !== "day" &&
            dates.slice(0, 7).map((date) => (
              <div
                key={`header-${date.toISOString()}`}
                className="text-center text-sm text-white/60 font-medium"
              >
                {format(date, "EEE")}
              </div>
            ))}

          {/* Calendar days */}
          {dates.map((date) => {
            const dayMeetings = meetings.filter(
              (meeting) =>
                isSameDay(parseISO(meeting.start_date), date) ||
                isSameDay(parseISO(meeting.end_date), date)
            );

            if (view === "day") {
              const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm
              const now = new Date();
              const currentTimePercentage = isToday(date)
                ? getTimeBlockPosition(now.toISOString())
                : -1;

              return (
                <div
                  key={date.toISOString()}
                  className="relative min-h-[800px] p-2 rounded border border-overlay-10"
                >
                  {/* Time labels */}
                  <div className="absolute left-0 top-0 w-16 h-full border-r border-overlay-10">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute text-xs text-white/60"
                        style={{ top: `${((hour - 6) / 16) * 100}%` }}
                      >
                        {format(setHours(date, hour), "HH:mm")}
                      </div>
                    ))}
                  </div>

                  {/* Time grid lines */}
                  <div className="absolute left-16 right-0 top-0 h-full">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-overlay-10"
                        style={{ top: `${((hour - 6) / 16) * 100}%` }}
                      />
                    ))}
                  </div>

                  {/* Current time indicator */}
                  {currentTimePercentage >= 0 && (
                    <div
                      className="absolute left-0 right-0 flex items-center z-10"
                      style={{ top: `${currentTimePercentage}%` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="flex-1 border-t border-red-500" />
                    </div>
                  )}

                  {/* Meetings */}
                  <div className="relative ml-16 h-full">
                    {dayMeetings.map((meeting, index) => {
                      const top = getTimeBlockPosition(meeting.start_date);
                      const height = getTimeBlockHeight(
                        meeting.start_date,
                        meeting.end_date
                      );

                      return (
                        <div
                          key={meeting.id}
                          className="absolute left-0 right-0 p-1 mx-1 rounded bg-overlay-20 hover:bg-overlay-30 transition-colors cursor-pointer"
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            zIndex: 1,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(date);
                          }}
                        >
                          <div className="text-xs font-medium truncate">
                            {meeting.name || "Untitled Meeting"}
                          </div>
                          <div className="text-xs text-white/60">
                            {format(parseISO(meeting.start_date), "HH:mm")} -{" "}
                            {format(parseISO(meeting.end_date), "HH:mm")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  ${(() => {
                    const v = view as CalendarView; // Explicitly cast to CalendarView
                    switch (v) {
                      case "month":
                        return "min-h-[100px]";
                      case "day":
                        return "min-h-[400px]";
                      case "week":
                        return "min-h-[120px]";
                    }
                  })()}
                  p-2 rounded border border-overlay-10 cursor-pointer
                  transition-colors hover:bg-overlay-10
                  ${isToday(date) ? "bg-overlay-10" : ""}
                  ${
                    selectedDate && isSameDay(date, selectedDate)
                      ? "ring-2 ring-blue-500"
                      : ""
                  }
                `}
              >
                <div className="text-sm mb-2">
                  {view === "month" ? format(date, "d") : format(date, "EEE d")}
                </div>
                <div className="space-y-1">
                  {dayMeetings
                    .slice(
                      0,
                      view === "month" || view === "week" ? 3 : undefined
                    )
                    .map((meeting) => (
                      <div
                        key={meeting.id}
                        className="text-xs p-1 pl-2 rounded bg-overlay-20 truncate flex items-center gap-1"
                        style={{
                          borderLeft: `3px solid ${
                            linkedAccounts[meeting.linked_account_id]?.color ||
                            "#fff"
                          }`,
                        }}
                        title={meeting.name || "Untitled Meeting"}
                      >
                        {format(parseISO(meeting.start_date), "HH:mm")} -{" "}
                        {meeting.name || "Untitled Meeting"}
                      </div>
                    ))}
                  {(view === "month" || view === "week") &&
                    dayMeetings.length > 3 && (
                      <div className="text-xs text-white/60">
                        +{dayMeetings.length - 3} more
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Meetings */}
        {selectedDate && selectedDateMeetings.length > 0 && (
          <div className="mt-6 pt-6 border-t border-overlay-10">
            <h3 className="text-sm font-medium mb-3">
              Meetings for {format(selectedDate, "MMMM d, yyyy")}
            </h3>
            <div className="space-y-2">
              {selectedDateMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-3 rounded bg-overlay-10 border border-overlay-20"
                  style={{
                    borderLeft: `4px solid ${
                      linkedAccounts[meeting.linked_account_id]?.color || "#fff"
                    }`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          linkedAccounts[meeting.linked_account_id]?.color,
                      }}
                    />
                    <div className="font-medium flex-1">
                      {meeting.name || "Untitled Meeting"}
                    </div>
                    <div className="text-xs text-white/60">
                      {linkedAccounts[meeting.linked_account_id]?.email}
                    </div>
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    {format(parseISO(meeting.start_date), "HH:mm")} -{" "}
                    {format(parseISO(meeting.end_date), "HH:mm")}
                  </div>
                  {meeting.location && (
                    <div className="text-sm text-white/60 mt-1">
                      📍 {meeting.location}
                    </div>
                  )}
                  {meeting.link && (
                    <a
                      href={meeting.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 mt-1 block"
                    >
                      🔗 Join Meeting
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
