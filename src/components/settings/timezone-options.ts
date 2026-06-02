export const COMMON_TIMEZONES = [
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

export function getTimezoneOptions(timezone: string, browserTimezone: string) {
  return Array.from(
    new Set(
      [timezone, browserTimezone, ...COMMON_TIMEZONES].filter((item) =>
        item.trim(),
      ),
    ),
  );
}
