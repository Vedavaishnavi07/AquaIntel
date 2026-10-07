import { it, expect } from "vitest";
import { summary, computeScenario } from "../apps/server/service";
import { costByCategory, feedCost, revenue } from "../packages/domain/index";
const cycle = {
  data: {
    stockingDate: "2026-01-01",
    stocked: 300000,
    initialBiomassKg: 0,
    feedComplete: true,
    costsComplete: true,
  },
};
const records = () =>
  ({
    daily: [],
    feed: [],
    sample: [
      { id: "s", date: "2026-02-01", data: { count: 100, weightG: 2000 } },
    ],
    water: [],
    cost: [],
    market: [],
    event: [],
    assumption: [
      { id: "a", date: "2026-02-01", data: { low: 70, base: 75, high: 80 } },
    ],
    decision: [],
    harvest: [],
    scenario: [],
  }) as Record<string, any[]>;
it("empty feed cannot become zero FCR even with completeness attested", () =>
  expect(summary(cycle, records(), "2026-02-01").fcr).toBeNull());
it("FCR does not mix future feed with past biomass", () => {
  const r = records();
  r.feed = [
    { date: "2026-02-01", data: { kg: 4500 } },
    { date: "2026-02-02", data: { kg: 100 } },
  ];
  expect(summary(cycle, r, "2026-02-02").fcr).toBe(1);
});
it("no costs cannot produce known profit", () => {
  const result = computeScenario(cycle, records(), {
    date: "2026-02-01",
    price: 300,
    dailyFeedKg: 100,
    feedPrice: 80,
    dailyOperating: 2000,
  });
  expect(result.results[0].bands!.base.profitPaise).toBeNull();
});
it("category totals live in the domain engine", () =>
  expect(
    costByCategory([
      { category: "Feed", amountPaise: 100 },
      { category: "Feed", amountPaise: 200 },
      { category: "Seed", amountPaise: 50 },
    ]),
  ).toEqual({ Feed: 300, Seed: 50 }));
it("rejects money overflow instead of false precision", () => {
  expect(() => feedCost(1e12, 1e12)).toThrow();
  expect(() => revenue(1e12, 1e12)).toThrow();
});
