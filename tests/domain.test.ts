import { describe, it, expect } from "vitest";
import {
  doc,
  day,
  sampling,
  growth,
  survivalBand,
  biomass,
  total,
  money,
  feedCost,
  revenue,
  profit,
  fcr,
  scenarios,
  csv,
} from "../packages/domain/index";
import * as v from "../packages/validation/index";
describe("hand-worked aquaculture calculations", () => {
  it("DOC across leap day and stocking day", () => {
    expect(doc("2024-02-28", "2024-03-01")).toBe(2);
    expect(doc("2026-07-01", "2026-07-01")).toBe(0);
  });
  it("rejects impossible and backwards dates", () => {
    expect(() => day("2026-02-30")).toThrow();
    expect(() => doc("2026-07-02", "2026-07-01")).toThrow();
  });
  it("100 shrimp weighing 1680g yields 16.8g ABW and 59.52 count", () => {
    expect(sampling(100, 1680).abw).toBe(16.8);
    expect(sampling(100, 1680).countPerKg).toBeCloseTo(59.523809);
  });
  it.each([
    [0, 100],
    [100, 0],
    [-1, 100],
    [1.5, 100],
    [100, NaN],
  ])("rejects invalid sample %s/%s", (n, w) =>
    expect(() => sampling(n, w)).toThrow(),
  );
  it("growth is 2g over 10 days", () => {
    const g = growth(
      { date: "2026-07-01", abw: 10 },
      { date: "2026-07-11", abw: 12 },
    );
    expect(g.daily).toBe(0.2);
    expect(g.countChange).toBeCloseTo(-16.66667);
  });
  it("same day cannot estimate growth", () =>
    expect(() =>
      growth({ date: "2026-07-01", abw: 10 }, { date: "2026-07-01", abw: 12 }),
    ).toThrow());
  it("negative measured growth is preserved", () =>
    expect(
      growth({ date: "2026-07-01", abw: 12 }, { date: "2026-07-11", abw: 10 })
        .daily,
    ).toBe(-0.2));
  it("300k stocked at 20g yields 4200/4500/4800kg", () =>
    expect([70, 75, 80].map((s) => biomass(300000, 20, s))).toEqual([
      4200, 4500, 4800,
    ]));
  it("validates ordered survival bounds including zero", () => {
    expect(survivalBand(0, 0, 100).low).toBe(0);
    expect(() => survivalBand(80, 70, 90)).toThrow();
    expect(() => survivalBand(0, 50, 101)).toThrow();
  });
  it("feed aggregation and costs", () => {
    expect(total([12.5, 20, 0])).toBe(32.5);
    expect(feedCost(12.5, 8000)).toBe(100000);
    expect(money(10.125)).toBe(1013);
  });
  it("negative feed never valid", () =>
    expect(() => total([10, -1])).toThrow());
  it("FCR uses gain not gross biomass", () => {
    expect(fcr(5400, 4500, 0, true)).toBe(1.2);
    expect(fcr(5400, 4500, 100, true)).toBeCloseTo(1.22727);
    expect(fcr(100, 100, 100, true)).toBeNull();
  });
  it("FCR refuses unknown or incomplete inputs", () => {
    expect(fcr(5400, 4500, null, true)).toBeNull();
    expect(fcr(5400, 4500, 0, false)).toBeNull();
  });
  it("revenue and profit use paise", () => {
    expect(revenue(4500, 30000)).toBe(135000000);
    expect(profit(135000000, 100000000)).toBe(35000000);
    expect(profit(100, 200)).toBe(-100);
  });
  const input = {
    asOf: "2026-07-11",
    sampleDate: "2026-07-11",
    abw: 20,
    dailyGrowth: 0.2,
    stocked: 300000,
    survival: { low: 70, base: 75, high: 80 },
    pricePaise: 30000,
    dailyFeedKg: 100,
    feedPricePaise: 8000,
    dailyOperatingPaise: 200000,
    recordedCostPaise: 100000000,
    costsComplete: true,
  };
  it("seven-day hand calculation: 21.4g, 4815kg, ₹374,500 base profit", () => {
    const s = scenarios(input)[2];
    expect(s.abw).toBe(21.4);
    expect(s.additionalFeedKg).toBe(700);
    expect(s.additionalCostPaise).toBe(7000000);
    expect(s.bands!.base.biomassKg).toBeCloseTo(4815);
    expect(s.bands!.base.profitPaise).toBe(37450000);
  });
  it("ages stale samples before NOW scenario", () =>
    expect(scenarios({ ...input, sampleDate: "2026-07-01" })[0].abw).toBe(22));
  it("single sample future is unknown", () => {
    const rows = scenarios({ ...input, dailyGrowth: null });
    expect(rows[0].abw).toBe(20);
    expect(rows[1].abw).toBeNull();
    expect(rows[1].bands).toBeNull();
  });
  it("unknown prior costs only allow subtotal margin", () => {
    const s = scenarios({ ...input, costsComplete: false })[0];
    expect(s.bands!.base.profitPaise).toBeNull();
    expect(s.bands!.base.marginPaise).toBe(35000000);
  });
  it("CSV escapes spreadsheet formulas and preserves unknown", () => {
    const out = csv([{ note: "=cmd()", value: null }]);
    expect(out).toContain("'=cmd()");
    expect(out).toContain('""');
  });
});
describe("data contracts", () => {
  it("preserves unknown feed as null", () =>
    expect(
      v.daily.parse({ date: "2026-07-01", feedKg: null }).feedKg,
    ).toBeNull());
  it("rejects negative feed", () =>
    expect(v.daily.safeParse({ date: "2026-07-01", feedKg: -1 }).success).toBe(
      false,
    ));
  it("rejects future records", () =>
    expect(v.daily.safeParse({ date: "2999-01-01" }).success).toBe(false));
  it("rejects zero market price", () =>
    expect(
      v.market.safeParse({
        date: "2026-07-01",
        location: "Test",
        countPerKg: 40,
        price: 0,
        source: "Buyer",
      }).success,
    ).toBe(false));
  it("checks pH limits and units", () => {
    expect(
      v.water.safeParse({
        date: "2026-07-01",
        metric: "pH",
        value: 15,
        unit: "pH",
        source: "Meter",
      }).success,
    ).toBe(false);
    expect(
      v.water.safeParse({
        date: "2026-07-01",
        metric: "DO",
        value: 5,
        unit: "ppt",
        source: "Meter",
      }).success,
    ).toBe(false);
  });
});
