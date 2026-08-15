// NFR-008: All dates stored in UTC; displayed in owner timezone.
// Storage uses JS Date (UTC epoch). Display/form-input conversion uses Intl
// timezone math so we never depend on the server's local zone.

/** Resolve the millisecond offset between UTC and the given IANA timezone at `instant`. */
function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  const asLocal = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second),
  );
  // local epoch - utc epoch = offset to add to UTC to reach local wall clock
  return asLocal - instant.getTime();
}

const FALLBACK_TZ = "UTC";

/** Validate an IANA timezone string is usable by Intl. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Interpret a wall-clock value (date or datetime-local string) as being in the
 * owner timezone and return the equivalent UTC Date. Two-pass for DST safety.
 */
export function ownerWallClockToUtc(value: string, tz: string): Date {
  const zone = isValidTimeZone(tz) ? tz : FALLBACK_TZ;
  const trimmed = value.trim();
  const [datePart, timePartRaw] = trimmed.split("T");
  const timePart = timePartRaw && timePartRaw.length >= 5 ? timePartRaw : "00:00";
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  if (!y || !mo || !d) throw new Error("Invalid date value");
  const guess = new Date(Date.UTC(y, mo - 1, d, h || 0, mi || 0, 0));
  const off1 = tzOffsetMs(guess, zone);
  const utc = guess.getTime() - off1;
  const off2 = tzOffsetMs(new Date(utc), zone);
  // refine: utc - (off2 - off1) corrects residual DST jump
  return new Date(utc - (off2 - off1));
}

/** Format a stored UTC Date for display in the owner timezone. */
export function formatInTimeZone(
  date: Date | string | null | undefined,
  tz: string,
  opts: { withTime?: boolean; dateStyle?: "short" | "medium" | "long" } = {},
): string {
  if (date == null) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const zone = isValidTimeZone(tz) ? tz : FALLBACK_TZ;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(opts.withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
  return formatter.format(d);
}

/** Current UTC timestamp for storage. */
export function nowUtc(): Date {
  return new Date();
}
