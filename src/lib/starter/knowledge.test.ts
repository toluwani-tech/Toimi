import { describe, expect, it } from "vitest";

import { buildStarterSystemPrompt } from "./knowledge";

describe("buildStarterSystemPrompt", () => {
  const prompt = buildStarterSystemPrompt();

  it("instructs the model to gather info before advising", () => {
    expect(prompt).toMatch(/ÄLÄ anna vielä konkreettista neuvoa/);
  });

  it("includes the core regulatory topics from the knowledge base", () => {
    expect(prompt).toMatch(/Toiminimi/);
    expect(prompt).toMatch(/osakeyhtiö/i);
    expect(prompt).toMatch(/YEL/);
    expect(prompt).toMatch(/käännetty arvonlisävero/);
    expect(prompt).toMatch(/Hinnoittelu/);
  });

  it("tells the model this is guidance, not professional tax/legal advice", () => {
    expect(prompt).toMatch(/ei virallista vero- tai lakineuvontaa/);
  });

  it("is deterministic", () => {
    expect(buildStarterSystemPrompt()).toBe(prompt);
  });
});
