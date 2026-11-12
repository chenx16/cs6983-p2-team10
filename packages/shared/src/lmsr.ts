const LIQUIDITY = 500;
const SHARE_SCALE = 100;
const PRICE_SCALE = 100;
const MIN_STARTING_PRICE = 10;
const MAX_STARTING_PRICE = 90;
const MIN_BUDGET = 10;
const COST_PRECISION = 1_000_000_000;

export type LmsrAnswer = "A" | "B";

export interface LmsrMarket {
  startingPriceA: number;
  aShares: number;
  bShares: number;
}

export interface LmsrPrices {
  a: number;
  b: number;
}

export interface LmsrPurchase {
  shares: number;
  charge: number;
  averagePrice: number;
  prices: LmsrPrices;
}

export function createMarket(startingPriceA = 50): LmsrMarket {
  assertStartingPrice(startingPriceA);

  return {
    startingPriceA,
    aShares: 0,
    bShares: 0,
  };
}

export function calculateCost(
  market: LmsrMarket,
  answer: LmsrAnswer,
  shares: number,
): number {
  assertMarket(market);
  assertAnswer(answer);
  assertShares(shares);

  const currentCost = costFunction(market);
  const nextMarket = {
    ...market,
    ...(answer === "A"
      ? { aShares: market.aShares + shares }
      : { bShares: market.bShares + shares }),
  };

  return costFunction(nextMarket) - currentCost;
}

export function calculatePrices(market: LmsrMarket): LmsrPrices {
  assertMarket(market);

  const probabilityA = logistic(stateValue(market, "A") - stateValue(market, "B"));
  const displayedA = clamp(Math.round(probabilityA * PRICE_SCALE), 1, 99);

  return {
    a: displayedA,
    b: 100 - displayedA,
  };
}

export function calculatePurchaseForBudget(
  market: LmsrMarket,
  answer: LmsrAnswer,
  budget: number,
): LmsrPurchase {
  assertMarket(market);
  assertAnswer(answer);
  assertBudget(budget);

  let low = 0;
  let high = 100;
  while (chargeForShares(market, answer, high) <= budget) {
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (chargeForShares(market, answer, middle) <= budget) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const charge = chargeForShares(market, answer, low);
  if (charge < MIN_BUDGET) {
    throw new Error("Budget must purchase at least 10 credits of shares.");
  }

  const purchasedMarket = {
    ...market,
    ...(answer === "A"
      ? { aShares: market.aShares + low }
      : { bShares: market.bShares + low }),
  };

  return {
    shares: low,
    charge,
    averagePrice: charge / (low / SHARE_SCALE),
    prices: calculatePrices(purchasedMarket),
  };
}

function chargeForShares(
  market: LmsrMarket,
  answer: LmsrAnswer,
  shares: number,
): number {
  return Math.ceil(roundForCharge(calculateCost(market, answer, shares)));
}

function costFunction(market: LmsrMarket): number {
  const terms = [stateValue(market, "A"), stateValue(market, "B")];
  return LIQUIDITY * logSumExp(terms);
}

function stateValue(market: LmsrMarket, answer: LmsrAnswer): number {
  const shares = answer === "A" ? market.aShares : market.bShares;
  const offset = answer === "A" ? startingOffset(market.startingPriceA) : 0;

  return (shares / SHARE_SCALE + offset) * (PRICE_SCALE / LIQUIDITY);
}

function startingOffset(startingPriceA: number): number {
  const probability = startingPriceA / PRICE_SCALE;
  return 5 * Math.log(probability / (1 - probability));
}

function logSumExp(values: number[]): number {
  const maximum = Math.max(...values);
  return maximum + Math.log(
    values.reduce((sum, value) => sum + Math.exp(value - maximum), 0),
  );
}

function logistic(value: number): number {
  if (value >= 0) {
    const exponential = Math.exp(-value);
    return 1 / (1 + exponential);
  }

  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

function roundForCharge(value: number): number {
  return Math.round(value * COST_PRECISION) / COST_PRECISION;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function assertMarket(market: LmsrMarket): void {
  if (!market || typeof market !== "object") {
    throw new Error("Market must be an object.");
  }

  assertStartingPrice(market.startingPriceA);
  assertShares(market.aShares);
  assertShares(market.bShares);
}

function assertStartingPrice(value: number): void {
  if (
    !Number.isFinite(value)
    || !Number.isInteger(value)
    || value < MIN_STARTING_PRICE
    || value > MAX_STARTING_PRICE
  ) {
    throw new Error("Starting price must be an integer from 10 to 90.");
  }
}

function assertShares(value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Shares must be a non-negative integer in hundredths.");
  }
}

function assertBudget(value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < MIN_BUDGET) {
    throw new Error("Budget must be an integer of at least 10 credits.");
  }
}

function assertAnswer(value: string): asserts value is LmsrAnswer {
  if (value !== "A" && value !== "B") {
    throw new Error("Answer must be A or B.");
  }
}
