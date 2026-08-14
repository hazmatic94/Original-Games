import { describe, expect, it } from "vitest";
import { sanitizeBetAmountInput } from "./formatting.js";

describe("sanitizeBetAmountInput", () => {
  it("strips leading zeros", () => {
    expect(sanitizeBetAmountInput("0900")).toBe("900");
    expect(sanitizeBetAmountInput("007")).toBe("7");
    expect(sanitizeBetAmountInput("0")).toBe("0");
    expect(sanitizeBetAmountInput("")).toBe("");
  });
});
