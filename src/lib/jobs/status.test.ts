import { describe, expect, it } from "vitest";

import { canTransitionJob, isJobEditable } from "./status";

describe("canTransitionJob", () => {
  it("allows SCHEDULED to IN_PROGRESS", () => {
    expect(canTransitionJob("SCHEDULED", "IN_PROGRESS")).toBe(true);
  });

  it("allows SCHEDULED to CANCELLED", () => {
    expect(canTransitionJob("SCHEDULED", "CANCELLED")).toBe(true);
  });

  it("allows IN_PROGRESS to COMPLETED", () => {
    expect(canTransitionJob("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("allows IN_PROGRESS to CANCELLED", () => {
    expect(canTransitionJob("IN_PROGRESS", "CANCELLED")).toBe(true);
  });

  it("rejects skipping SCHEDULED straight to COMPLETED", () => {
    expect(canTransitionJob("SCHEDULED", "COMPLETED")).toBe(false);
  });

  it("rejects any transition out of COMPLETED", () => {
    expect(canTransitionJob("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionJob("COMPLETED", "SCHEDULED")).toBe(false);
  });

  it("rejects any transition out of CANCELLED", () => {
    expect(canTransitionJob("CANCELLED", "SCHEDULED")).toBe(false);
    expect(canTransitionJob("CANCELLED", "IN_PROGRESS")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransitionJob("SCHEDULED", "SCHEDULED")).toBe(false);
  });
});

describe("isJobEditable", () => {
  it("is editable while SCHEDULED", () => {
    expect(isJobEditable("SCHEDULED")).toBe(true);
  });

  it("is editable while IN_PROGRESS", () => {
    expect(isJobEditable("IN_PROGRESS")).toBe(true);
  });

  it("is not editable once COMPLETED", () => {
    expect(isJobEditable("COMPLETED")).toBe(false);
  });

  it("is not editable once CANCELLED", () => {
    expect(isJobEditable("CANCELLED")).toBe(false);
  });
});
