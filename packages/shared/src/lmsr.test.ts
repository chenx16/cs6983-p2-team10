import { describe, expect, it } from "vitest";
import {
  calculateCost,
  calculatePrices,
  calculatePurchaseForBudget,
  createMarket,
} from "./lmsr";

describe("LMSR A/B pricing", () => {
  it("starts at the requested A/B prices", () => {
    expect(calculatePrices(createMarket(50))).toEqual({
      a: 50,
      b: 50,
    });
    expect(calculatePrices(createMarket(70))).toEqual({
      a: 70,
      b: 30,
    });
  });

  it("moves prices in the direction of the purchased answer", () => {
    const market = createMarket(50);

    expect(calculatePrices({
      ...market,
      aShares: 100,
    }).a).toBeGreaterThan(50);
    expect(calculatePrices({
      ...market,
      bShares: 100,
    }).b).toBeGreaterThan(50);
  });

  it("keeps displayed prices between 1 and 99 and totaling 100", () => {
    const market = createMarket(50);
    const prices = calculatePrices({
      ...market,
      aShares: 100_000,
    });

    expect(prices.a).toBeGreaterThanOrEqual(1);
    expect(prices.a).toBeLessThanOrEqual(99);
    expect(prices.b).toBe(100 - prices.a);
  });

  it("calculates the unrounded LMSR purchase cost", () => {
    const cost = calculateCost(createMarket(50), "A", 354);

    expect(cost).toBeCloseTo(207.7, 1);
  });

  it("reproduces the PRD worked example", () => {
    const purchase = calculatePurchaseForBudget(createMarket(50), "A", 208);

    expect(purchase.shares).toBe(354);
    expect(purchase.charge).toBe(208);
    expect(purchase.averagePrice).toBeCloseTo(208 / 3.54, 1);
    expect(purchase.prices.a).toBe(67);
    expect(purchase.prices.b).toBe(33);
  });

  it("uses the largest hundredth-share purchase within the budget", () => {
    const purchase = calculatePurchaseForBudget(createMarket(50), "A", 208);

    expect(purchase.shares % 1).toBe(0);
    expect(purchase.charge).toBeLessThanOrEqual(208);
    expect(calculateCost(createMarket(50), "A", purchase.shares + 1)).toBeGreaterThan(208);
  });

  it("does not charge 209 when floating-point noise is just above 208", () => {
    const purchase = calculatePurchaseForBudget(createMarket(50), "A", 208);

    expect(purchase.charge).toBe(208);
  });

  it("accepts integer hundredths of shares without accumulating decimal error", () => {
    const market = createMarket(50);
    const afterFirst = {
      ...market,
      aShares: 354,
    };
    const afterSecond = {
      ...afterFirst,
      aShares: afterFirst.aShares + 354,
    };

    expect(afterSecond.aShares).toBe(708);
    expect(calculatePrices(afterSecond).a).toBeGreaterThan(
      calculatePrices(afterFirst).a,
    );
  });

  it("rejects invalid shares, budgets, prices, and non-finite numbers", () => {
    expect(() => createMarket(9)).toThrow();
    expect(() => createMarket(91)).toThrow();
    expect(() => calculateCost(createMarket(50), "A", -1)).toThrow();
    expect(() => calculatePurchaseForBudget(createMarket(50), "A", 10.5)).toThrow();
    expect(() => calculatePurchaseForBudget(createMarket(50), "A", Number.NaN)).toThrow();
  });

  it("rejects budgets below the ten-credit minimum", () => {
    expect(() => calculatePurchaseForBudget(createMarket(50), "A", 9)).toThrow();
  });
});
