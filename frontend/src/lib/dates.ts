/**
 * SORA Date & Timezone Utilities
 * Ensures consistent local browser timezone interpretation and UTC conversions.
 */

/**
 * Returns the browser's current IANA time zone identifier (e.g., "Europe/London", "America/New_York").
 */
export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Converts an ISO string, Date object, or timestamp to a local "YYYY-MM-DD" calendar date key.
 * Uses local getFullYear, getMonth, and getDate to avoid UTC day-boundary drift.
 * Never uses toISOString().
 */
export function toLocalDateKey(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes the ISO UTC strings for local midnight to the next midnight for a given date.
 * Useful for querying intervals (e.g., from/to date ranges).
 */
export function localDayRange(date: Date | string): { from: string; to: string } {
  let d: Date;
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);
      d = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      d = new Date(date);
    }
  } else {
    d = new Date(date.getTime());
  }

  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/**
 * Converts local form input values ("YYYY-MM-DD" and optional "HH:mm") into a UTC ISO string.
 * Returns null if no date is provided.
 */
export function fromLocalInput(dateStr: string, timeStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const [year, month, day] = dateStr.trim().split("-").map(Number);
  if (!year || !month || !day) return null;

  let hours = 0;
  let minutes = 0;
  if (timeStr && timeStr.trim()) {
    const parts = timeStr.trim().split(":").map(Number);
    if (!isNaN(parts[0])) hours = parts[0];
    if (!isNaN(parts[1])) minutes = parts[1];
  }

  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Extracts local date ("YYYY-MM-DD") and time ("HH:mm") strings suitable for
 * <input type="date"> and <input type="time"> from an ISO string.
 */
export function toLocalInputs(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };

  const date = toLocalDateKey(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${hours}:${minutes}` };
}

/**
 * Checks if a task is overdue (past current time).
 */
export function isOverdue(dueAt: string | null | undefined): boolean {
  if (!dueAt) return false;
  const t = new Date(dueAt).getTime();
  if (isNaN(t)) return false;
  return t < Date.now();
}

/**
 * Checks if a task is due soon (within the next 24 hours and not yet overdue).
 */
export function isDueSoon(dueAt: string | null | undefined): boolean {
  if (!dueAt) return false;
  const t = new Date(dueAt).getTime();
  if (isNaN(t)) return false;
  const now = Date.now();
  const diff = t - now;
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

/**
 * Checks if a task's due date falls on today in the browser's local timezone.
 */
export function isToday(dueAt: string | null | undefined): boolean {
  if (!dueAt) return false;
  return toLocalDateKey(dueAt) === toLocalDateKey(new Date());
}

/*
// examples:
//
// 1. toLocalDateKey(iso)
//    In a browser running in British Summer Time (BST = UTC+1):
//    toLocalDateKey("2026-10-25T23:30:00Z") => "2026-10-26"
//    (Because 23:30 UTC is 00:30 BST the next day; toISOString().split('T')[0] would erroneously yield "2026-10-25")
//
// 2. localDayRange(date)
//    In a browser running in America/New_York (EDT = UTC-4):
//    localDayRange("2026-10-25") =>
//    {
//      from: "2026-10-25T04:00:00.000Z", // midnight EDT in UTC
//      to:   "2026-10-26T04:00:00.000Z"  // next midnight EDT in UTC
//    }
//
// 3. fromLocalInput(dateStr, timeStr) & toLocalInputs(iso)
//    In a browser running in Europe/London (BST = UTC+1):
//    const iso = fromLocalInput("2026-10-26", "14:30"); // -> "2026-10-26T13:30:00.000Z"
//    toLocalInputs(iso) => { date: "2026-10-26", time: "14:30" }
*/
