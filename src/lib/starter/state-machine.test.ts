import { describe, expect, it } from "vitest";

import { advanceStatus } from "./state-machine";

describe("advanceStatus", () => {
  it("moves forward from GATHERING_INFO to ADVISING", () => {
    expect(advanceStatus("GATHERING_INFO", "ADVISING")).toBe("ADVISING");
  });

  it("moves forward from ADVISING to PLAN_READY", () => {
    expect(advanceStatus("ADVISING", "PLAN_READY")).toBe("PLAN_READY");
  });

  it("skips straight from GATHERING_INFO to PLAN_READY if the model proposes it", () => {
    expect(advanceStatus("GATHERING_INFO", "PLAN_READY")).toBe("PLAN_READY");
  });

  it("stays put when the model repeats the current status", () => {
    expect(advanceStatus("ADVISING", "ADVISING")).toBe("ADVISING");
  });

  it("ignores a regression from PLAN_READY back to GATHERING_INFO", () => {
    expect(advanceStatus("PLAN_READY", "GATHERING_INFO")).toBe("PLAN_READY");
  });

  it("ignores a regression from PLAN_READY back to ADVISING", () => {
    expect(advanceStatus("PLAN_READY", "ADVISING")).toBe("PLAN_READY");
  });

  it("ignores a regression from ADVISING back to GATHERING_INFO", () => {
    expect(advanceStatus("ADVISING", "GATHERING_INFO")).toBe("ADVISING");
  });
});
