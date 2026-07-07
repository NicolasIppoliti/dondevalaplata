import { describe, expect, it } from "vitest";

describe("test runner smoke check", () => {
  it("runs and asserts basic arithmetic", () => {
    expect(1 + 1).toBe(2);
  });
});
