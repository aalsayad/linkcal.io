interface MonthViewProps {
  meetings: any[];
  selectedDate: Date;
  getAccountColor: (id: string) => string;
}

export const MonthView = ({
  meetings,
  selectedDate,
  getAccountColor,
}: MonthViewProps) => {
  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div>
      {/* Week day headers - Hide on mobile */}
      <div className="hidden md:grid md:grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm text-white/60 p-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
        {/* Empty cells for proper date alignment */}
        {Array(firstDayOfMonth)
          .fill(null)
          .map((_, index) => (
            <div key={`empty-${index}`} className="p-2 hidden md:block" />
          ))}

        {days.map((day) => {
          const dayMeetings = meetings.filter(
            (meeting) =>
              new Date(meeting.date).getDate() === day &&
              new Date(meeting.date).getMonth() === selectedDate.getMonth()
          );

          return (
            <div
              key={day}
              className="p-2 min-h-[80px] md:min-h-[100px] border border-overlay-10 rounded"
            >
              <div className="text-xs md:text-sm mb-1 flex items-center justify-between md:justify-start">
                <span className="md:hidden">
                  {new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    day
                  ).toLocaleDateString("en-US", { weekday: "long" })}
                </span>
                {isToday(day) ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-500">
                    {day}
                  </span>
                ) : (
                  <span>{day}</span>
                )}
              </div>
              {dayMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={`text-xs p-1 bg-overlay-15 rounded mb-1 truncate border-l-4 ${getAccountColor(
                    meeting.linked_account_id
                  )}`}
                  title={meeting.name}
                >
                  {meeting.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
