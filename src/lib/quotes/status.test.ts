import { describe, expect, it } from "vitest";

import { canTransition } from "./status";

describe("canTransition", () => {
  it("allows DRAFT to SENT", () => {
    expect(canTransition("DRAFT", "SENT")).toBe(true);
  });

  it("allows SENT to ACCEPTED", () => {
    expect(canTransition("SENT", "ACCEPTED")).toBe(true);
  });

  it("allows SENT to REJECTED", () => {
    expect(canTransition("SENT", "REJECTED")).toBe(true);
  });

  it("rejects skipping DRAFT straight to ACCEPTED", () => {
    expect(canTransition("DRAFT", "ACCEPTED")).toBe(false);
  });

  it("rejects going back from SENT to DRAFT", () => {
    expect(canTransition("SENT", "DRAFT")).toBe(false);
  });

  it("rejects any transition out of ACCEPTED", () => {
    expect(canTransition("ACCEPTED", "SENT")).toBe(false);
    expect(canTransition("ACCEPTED", "REJECTED")).toBe(false);
    expect(canTransition("ACCEPTED", "DRAFT")).toBe(false);
  });

  it("rejects any transition out of REJECTED", () => {
    expect(canTransition("REJECTED", "SENT")).toBe(false);
    expect(canTransition("REJECTED", "ACCEPTED")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransition("DRAFT", "DRAFT")).toBe(false);
    expect(canTransition("SENT", "SENT")).toBe(false);
  });
});
