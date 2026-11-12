import { describe, expect, it } from "vitest";
import {
  calculatePurchaseForBudget,
  createMarket,
  placePredictionRequestSchema,
  predictionPreviewRequestSchema,
  predictionPreviewResponseSchema,
} from "./index";

describe("prediction contracts", () => {
  it("accepts a valid preview request", () => {
    expect(predictionPreviewRequestSchema.parse({
      answerId: "answer-a",
      budget: 208,
    })).toEqual({
      answerId: "answer-a",
      budget: 208,
    });
  });

  it("requires an integer budget of at least 10 credits", () => {
    expect(predictionPreviewRequestSchema.safeParse({
      answerId: "answer-a",
      budget: 9,
    }).success).toBe(false);
    expect(predictionPreviewRequestSchema.safeParse({
      answerId: "answer-a",
      budget: 10.5,
    }).success).toBe(false);
  });

  it("accepts a confirmation request with the minimum shares from preview", () => {
    expect(placePredictionRequestSchema.parse({
      answerId: "answer-a",
      budget: 208,
      minShares: 354,
      idempotencyKey: "prediction-1",
    })).toEqual({
      answerId: "answer-a",
      budget: 208,
      minShares: 354,
      idempotencyKey: "prediction-1",
    });
  });

  it("describes the complete private preview response", () => {
    expect(predictionPreviewResponseSchema.parse({
      questionId: "question-1",
      answerId: "answer-a",
      shares: 354,
      charge: 208,
      averagePrice: 208 / 3.54,
      prices: { a: 67, b: 33 },
      payoutIfCorrect: 354,
      balance: 792,
      marketVersion: 4,
    }).shares).toBe(354);
  });
});

describe("prediction preview calculation", () => {
  it("reuses the LMSR purchase calculation for an A/B preview", () => {
    const purchase = calculatePurchaseForBudget(createMarket(50), "A", 208);

    expect(purchase).toMatchObject({
      shares: 354,
      charge: 208,
      prices: { a: 67, b: 33 },
    });
    expect(purchase.averagePrice).toBeCloseTo(208 / 3.54, 1);
  });
});
