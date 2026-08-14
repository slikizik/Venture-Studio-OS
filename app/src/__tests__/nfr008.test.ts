// TEST-NFR-008 — All dates stored in UTC; displayed in owner timezone
import { describe, it, expect } from "vitest";
import { ownerWallClockToUtc, formatInTimeZone, isValidTimeZone } from "../lib/datetime";

describe("TEST-NFR-008: UTC storage, owner timezone display", () => {
  it("stores a wall-clock owner time as UTC", () => {
    // 2026-06-15 10:00 in Africa/Johannesburg (UTC+2) => 08:00 UTC
    const utc = ownerWallClockToUtc("2026-06-15T10:00", "Africa/Johannesburg");
    expect(utc.toISOString()).toBe("2026-06-15T08:00:00.000Z");
  });

  it("round-trips UTC to owner timezone display", () => {
    const utc = new Date("2026-06-15T08:00:00.000Z");
    const displayed = formatInTimeZone(utc, "Africa/Johannesburg");
    // en-CA medium default => YYYY-MM-DD
    expect(displayed).toBe("2026-06-15");
  });

  it("displays with time in a non-UTC zone shifted correctly", () => {
    const utc = new Date("2026-06-15T08:00:00.000Z");
    const displayed = formatInTimeZone(utc, "Africa/Johannesburg", { withTime: true });
    // en-CA locale renders "2026-06-15, 10:00" — verify date + shifted hour
    expect(displayed).toContain("2026-06-15");
    expect(displayed).toContain("10:00");
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    const utc = new Date("2026-06-15T08:00:00.000Z");
    const displayed = formatInTimeZone(utc, "Not/AZone", { withTime: true });
    expect(displayed).toContain("2026-06-15");
    expect(displayed).toContain("08:00");
  });
});
