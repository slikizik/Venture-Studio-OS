// TEST-ENV-003 — Prevent runtime data sharing between isolated environments.
import { describe, it, expect } from "vitest";
import {
  assertNoCrossEnvLeak,
  isEnvIsolatedFrom,
  type EnvironmentConfig,
} from "../lib/isolation";

const env = (id: string, db: string, storage: string, secret: string): EnvironmentConfig => ({
  id,
  name: id,
  dbPath: db,
  storageDir: storage,
  secretSource: secret,
});

describe("TEST-ENV-003: environment isolation boundary", () => {
  it("accepts environments that each own distinct data paths", () => {
    expect(
      assertNoCrossEnvLeak([
        env("dev", "/data/dev/app.db", "/data/dev/storage", "/data/dev/.env"),
        env("staging", "/data/staging/app.db", "/data/staging/storage", "/data/staging/.env"),
      ]),
    ).toBe(true);
  });

  it("rejects two environments sharing a database path", () => {
    expect(() =>
      assertNoCrossEnvLeak([
        env("dev", "/data/app.db", "/data/dev/storage", "/data/dev/.env"),
        env("staging", "/data/app.db", "/data/staging/storage", "/data/staging/.env"),
      ]),
    ).toThrow(/database path/i);
  });

  it("rejects two environments sharing a storage directory", () => {
    expect(() =>
      assertNoCrossEnvLeak([
        env("dev", "/data/dev/app.db", "/shared/storage", "/data/dev/.env"),
        env("staging", "/data/staging/app.db", "/shared/storage", "/data/staging/.env"),
      ]),
    ).toThrow(/storage directory/i);
  });

  it("rejects two environments sharing a secret source", () => {
    expect(() =>
      assertNoCrossEnvLeak([
        env("dev", "/data/dev/app.db", "/data/dev/storage", "/shared/.env"),
        env("staging", "/data/staging/app.db", "/data/staging/storage", "/shared/.env"),
      ]),
    ).toThrow(/secret source/i);
  });

  it("treats backslash and case variants as the same path", () => {
    expect(() =>
      assertNoCrossEnvLeak([
        env("dev", "C:\\data\\app.db", "/data/dev/storage", "/data/dev/.env"),
        env("staging", "c:/data/app.db", "/data/staging/storage", "/data/staging/.env"),
      ]),
    ).toThrow(/database path/i);
  });

  it("isEnvIsolatedFrom returns false when not isolated", () => {
    expect(isEnvIsolatedFrom(env("a", "/x/app.db", "/x/s", "/x/.env"), env("b", "/x/app.db", "/y/s", "/y/.env"))).toBe(false);
    expect(isEnvIsolatedFrom(env("a", "/x/app.db", "/x/s", "/x/.env"), env("b", "/z/app.db", "/z/s", "/z/.env"))).toBe(true);
  });
});
