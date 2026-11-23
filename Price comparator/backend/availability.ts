import type { State, Store } from "./types.ts";

export function openingStatus(
  store: Store,
  holidays: State["holidays"],
  now = new Date(),
): "open" | "closed" | "unknown" {
  if (
    store.status !== "ok" || !store.hours ||
    Date.now() - Date.parse(store.checkedAt) > 48 * 3600000
  ) return "unknown";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: store.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  if (store.closedOnHolidays) {
    if (!holidays || holidays.year !== Number(parts.year)) return "unknown";
    if (holidays.dates.includes(date)) return "closed";
  }
  const intervals = store.hours[String(day)];
  if (!intervals) return "unknown";
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  return intervals.some(([start, end]) =>
      minutes >= toMinutes(start) && minutes < toMinutes(end)
    )
    ? "open"
    : "closed";
}
