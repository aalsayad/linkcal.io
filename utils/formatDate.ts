export function parseUtcTimestamp(timestamp: string): Date {
  // Check whether the timestamp already contains a timezone offset (either "Z" or a numeric offset).
  const timezoneRegex = /(?:Z|[+\-]\d{2}:\d{2})$/;
  if (!timezoneRegex.test(timestamp)) {
    timestamp += "Z";
  }
  return new Date(timestamp);
}
