import { funnelHalfH } from "../FunilSVGCore";

const MAX = 82;
const MIN = 20;

describe("funnelHalfH", () => {
  it("returns maxHalf when v === vMax", () => {
    expect(funnelHalfH(100, 100, MAX, MIN)).toBeCloseTo(MAX);
  });

  it("returns minHalf when v === 0", () => {
    expect(funnelHalfH(0, 100, MAX, MIN)).toBe(MIN);
  });

  it("returns minHalf when vMax === 0", () => {
    expect(funnelHalfH(0, 0, MAX, MIN)).toBe(MIN);
  });

  it("scales by sqrt — v=25% of vMax → halfway between min and max", () => {
    // sqrt(0.25) = 0.5
    expect(funnelHalfH(25, 100, MAX, MIN)).toBeCloseTo(MIN + (MAX - MIN) * 0.5);
  });

  it("expands beyond maxHalf when v > vMax (non-monotonic)", () => {
    const result = funnelHalfH(150, 100, MAX, MIN);
    expect(result).toBeGreaterThan(MAX);
  });

  it("clamps negative v to 0 (returns minHalf)", () => {
    expect(funnelHalfH(-10, 100, MAX, MIN)).toBe(MIN);
  });
});
