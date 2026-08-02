import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatPercent,
  percentWidth,
  ratio,
} from "@/lib/utils/format";

describe("presentation of derived numbers", () => {
  it("formats whole dollars from cents", () => {
    expect(formatCurrency(0)).toBe("$0");
    expect(formatCurrency(1_250_00)).toBe("$1,250");
  });

  it("renders one rate at one precision everywhere it appears", () => {
    // The divergence this replaced: 84.06 stored, 84.1 on one page, 84 on
    // another. There is now a single answer.
    expect(formatPercent(770, 916)).toBe("84.1%");
    expect(formatPercent(3, 4)).toBe("75.0%");
  });

  it("treats a missing denominator as absent, not zero", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(formatPercent(0, 0)).toBe("—");
    expect(formatPercent(5, 0)).toBe("—");
    // Zero over a real denominator is a genuine zero and must still render.
    expect(formatPercent(0, 10)).toBe("0.0%");
  });

  it("rounds readiness to whole percent, because it counts six sections", () => {
    expect(formatPercent(3, 6, 0)).toBe("50%");
    expect(formatPercent(21, 24, 0)).toBe("88%");
  });

  it("clamps a meter width to its track and never divides by zero", () => {
    expect(percentWidth(3, 6)).toBe("50%");
    expect(percentWidth(0, 0)).toBe("0%");
    expect(percentWidth(9, 6)).toBe("100%");
    expect(percentWidth(-1, 6)).toBe("0%");
  });
});
