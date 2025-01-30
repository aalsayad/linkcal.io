import type { Meeting } from "@/db/schema";

export const validateMeetings = (
  events: Omit<Meeting, "user_id" | "created_at" | "updated_at">[]
): Omit<Meeting, "user_id" | "created_at" | "updated_at">[] => {
  return events.filter((event) => {
    try {
      return !isNaN(new Date(event.start_date).getTime());
    } catch {
      return false;
    }
  });
};

export const filterOutLinkcalTimeblocks = (events: any[]): any[] => {
  return events.filter(
    (event) =>
      !event.summary
        ?.toLowerCase()
        .includes(`${process.env.NEXT_PUBLIC_LINKCAL_TIMEBLOCK_NAME}`)
  );
};
