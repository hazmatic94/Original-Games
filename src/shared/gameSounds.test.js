import { describe, expect, it } from "vitest";
import { planResolveCue, soundCue } from "./gameSounds.js";

describe("planResolveCue", () => {
  it("puts the sting after foley and skips opening multipliers", () => {
    expect(
      planResolveCue({
        foley: "land",
        foleyAt: 400,
        sting: "multiplier",
      }),
    ).toEqual({
      foley: "land",
      foleyAt: 400,
      sting: "multiplier",
      stingAt: 400 + soundCue.stingGapMs,
    });

    expect(
      planResolveCue({
        opening: true,
        foley: "land",
        foleyAt: 520,
        sting: "multiplier",
      }),
    ).toEqual({
      foley: "land",
      foleyAt: 520,
      sting: null,
      stingAt: 0,
    });

    expect(planResolveCue({ opening: true, sting: "loss" })).toEqual({
      foley: null,
      foleyAt: 0,
      sting: "loss",
      stingAt: soundCue.stingGapMs,
    });
  });
});
