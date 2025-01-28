import { useEffect, useState } from "react";

interface DayViewProps {
  meetings: any[];
  selectedDate: Date;
  getAccountColor: (id: string) => string;
}

export const DayView = ({
  meetings,
  selectedDate,
  getAccountColor,
}: DayViewProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatHour = (hour: number) => {
    return `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
  };

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours + minutes / 60) * 64; // 64px for mobile (h-16) and 80px for desktop (h-20)
  };

  return (
    <div className="flex h-[600px] md:h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
      <div className="w-12 md:w-16 flex-shrink-0 sticky left-0 bg-overlay-5">
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-16 md:h-20 text-[10px] md:text-xs text-right pr-2 text-white/60"
          >
            {formatHour(hour)}
          </div>
        ))}
      </div>
      <div className="flex-grow border-l border-overlay-10 relative">
        {/* Current time indicator */}
        {selectedDate.toDateString() === new Date().toDateString() && (
          <div
            className="absolute w-full z-10 flex items-center pointer-events-none"
            style={{ top: `${getCurrentTimePosition()}px` }}
          >
            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-red-500 -ml-1"></div>
            <div className="flex-1 border-t border-red-500"></div>
          </div>
        )}

        {hours.map((hour) => {
          const hourMeetings = meetings.filter((meeting) => {
            const meetingDate = new Date(meeting.date);
            return (
              meetingDate.getHours() === hour &&
              meetingDate.toDateString() === selectedDate.toDateString()
            );
          });

          return (
            <div
              key={hour}
              className="h-16 md:h-20 border-b border-overlay-10 relative"
            >
              {hourMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.date);
                const minuteOffset = (meetingDate.getMinutes() / 60) * 100;

                return (
                  <div
                    key={meeting.id}
                    className={`absolute w-[95%] text-[10px] md:text-xs p-1 bg-overlay-15 rounded-sm truncate border-l-4 ${getAccountColor(
                      meeting.linked_account_id
                    )}`}
                    style={{
                      top: `${minuteOffset}%`,
                      height: "40px md:h-[50px]",
                    }}
                    title={`${
                      meeting.name
                    } - ${meetingDate.toLocaleTimeString()}`}
                  >
                    {meeting.name}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
