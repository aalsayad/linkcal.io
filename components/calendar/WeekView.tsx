interface WeekViewProps {
  meetings: any[];
  selectedDate: Date;
  getAccountColor: (id: string) => string;
}

export const WeekView = ({
  meetings,
  selectedDate,
  getAccountColor,
}: WeekViewProps) => {
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const weekDates = getWeekDates(selectedDate);

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
      {weekDates.map((date, index) => (
        <div
          key={index}
          className="min-h-[100px] md:min-h-[600px] border border-overlay-10 rounded p-2"
        >
          <div className="text-xs md:text-sm mb-2 sticky top-0 bg-overlay-5 flex items-center justify-between md:justify-start">
            <span className="md:hidden">
              {date.toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            <span className="hidden md:inline">
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            {isToday(date) ? (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-500">
                {date.getDate()}
              </span>
            ) : (
              <span>{date.getDate()}</span>
            )}
          </div>
          <div className="space-y-1">
            {meetings
              .filter(
                (meeting) =>
                  new Date(meeting.date).toDateString() === date.toDateString()
              )
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              )
              .map((meeting) => (
                <div
                  key={meeting.id}
                  className={`text-xs p-1 bg-overlay-15 rounded truncate border-l-4 ${getAccountColor(
                    meeting.linked_account_id
                  )}`}
                  title={`${meeting.name} - ${new Date(
                    meeting.date
                  ).toLocaleTimeString()}`}
                >
                  {new Date(meeting.date).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  <br />
                  {meeting.name}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
