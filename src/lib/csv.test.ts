import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins plain fields with commas and rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d");
  });

  it("quotes a field containing a comma", () => {
    expect(toCsv([["Putket, liittimet", "10"]])).toBe('"Putket, liittimet",10');
  });

  it("quotes a field containing a quote and doubles it", () => {
    expect(toCsv([['12" putki', "5"]])).toBe('"12"" putki",5');
  });

  it("quotes a field containing a newline", () => {
    expect(toCsv([["line one\nline two", "5"]])).toBe('"line one\nline two",5');
  });

  it("leaves a plain field unquoted", () => {
    expect(toCsv([["Konsultointi", "500"]])).toBe("Konsultointi,500");
  });
});
