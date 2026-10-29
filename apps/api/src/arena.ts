import {
  DEFAULT_CATEGORIES,
  QUESTION_STATUS_VALUES,
  type ArenaQuestion,
  type ArenaQuestionsQuery,
  type ArenaQuestionsResponse,
  type ArenaStatusCounts,
  type MultiAnswerItem,
  type QuestionStatus,
  type QuestionType,
  type QuestionVisibility,
} from "@forecasthub/shared";

export type QuestionResolution = "UNRESOLVED" | "RESOLVED" | "CANCELLED";

export type StoredAnswer = {
  id: string;
  label: string;
  credits: number;
};

export type StoredQuestion = {
  id: string;
  title: string;
  category: string;
  type: QuestionType;
  visibility: QuestionVisibility;
  resolution: QuestionResolution;
  deadline: Date;
  criteria: string;
  source: string;
  startingPriceA?: number;
  sharesA?: number;
  sharesB?: number;
  totalCredits: number;
  creditsLast24h: number;
  correctAnswerId: string | null;
  answers: StoredAnswer[];
};

export interface ArenaQuestionStore {
  getCategories(): Promise<string[]> | string[];
  getQuestions(): Promise<StoredQuestion[]> | StoredQuestion[];
}

const LMSR_LIQUIDITY = 500;
const WINNING_SHARE_PAYOUT = 100;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const ptDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const ptTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const ptYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
});

/**
 * LMSR starting offset A0 = 5 * ln(p0 / (1 - p0)) per PRD Section 5.1.4.
 */
export const computeLmsrStartingOffsetA0 = (startingPriceA: number): number => {
  const clampedStart = Math.min(90, Math.max(10, startingPriceA));
  const p0 = clampedStart / 100;
  return 5 * Math.log(p0 / (1 - p0));
};

/**
 * Full-precision LMSR price for answer A in [0, 1] per PRD Section 5.1.
 */
export const computeLmsrPriceA = (
  startingPriceA: number,
  sharesA: number,
  sharesB: number,
): number => {
  const a0 = computeLmsrStartingOffsetA0(startingPriceA);
  const exponent =
    (WINNING_SHARE_PAYOUT * sharesB) / LMSR_LIQUIDITY -
    (WINNING_SHARE_PAYOUT * (sharesA + a0)) / LMSR_LIQUIDITY;
  return 1 / (1 + Math.exp(exponent));
};

/**
 * Displayed whole-number A and B prices in 1..99 that always sum to 100 (CR-6).
 */
export const computeDisplayedAbPrices = (
  startingPriceA: number,
  sharesA: number,
  sharesB: number,
): [number, number] => {
  const rawPriceA = computeLmsrPriceA(startingPriceA, sharesA, sharesB);
  const displayedA = Math.min(99, Math.max(1, Math.round(rawPriceA * 100)));
  const displayedB = 100 - displayedA;
  return [displayedA, displayedB];
};

/**
 * Derives share quantities (sharesA, sharesB) that yield a target A price for seed data.
 */
const sharesForTargetPrice = (startingPriceA: number, targetPriceA: number, baseSharesB = 10): [number, number] => {
  const a0 = computeLmsrStartingOffsetA0(startingPriceA);
  const diff = 5 * Math.log(targetPriceA / (1 - targetPriceA)) - a0;
  const sharesB = Math.max(0, Math.round((baseSharesB - Math.min(0, diff)) * 100) / 100);
  const sharesA = Math.round((sharesB + diff) * 100) / 100;
  return [sharesA, sharesB];
};

/**
 * Computes a question's dynamic status relative to the current server time (US-2 AC 3 & 5, CR-4).
 */
export const computeQuestionStatus = (question: StoredQuestion, now: Date): QuestionStatus => {
  if (question.resolution === "CANCELLED") {
    return "CANCELLED";
  }
  if (question.resolution === "RESOLVED") {
    return "RESOLVED";
  }
  const remainingMs = question.deadline.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return "CLOSED";
  }
  if (remainingMs <= MS_PER_DAY) {
    return "CLOSING_SOON";
  }
  return "OPEN";
};

/**
 * Checks whether a question's status matches the selected status filters.
 * Per the Arena specification, selecting "OPEN" includes "CLOSING_SOON" questions
 * (since questions closing within 24h are still open for predictions), while selecting
 * "CLOSING_SOON" specifically filters to questions within 24 hours of their deadline.
 */
export const matchesStatusFilter = (
  questionStatus: QuestionStatus,
  selectedStatuses: readonly QuestionStatus[],
): boolean => {
  if (selectedStatuses.length === 0) {
    return true;
  }
  if (selectedStatuses.includes(questionStatus)) {
    return true;
  }
  if (questionStatus === "CLOSING_SOON" && selectedStatuses.includes("OPEN")) {
    return true;
  }
  return false;
};

/**
 * Formats a deadline explicitly in Pacific Time (CR-2).
 */
export const formatPacificDeadline = (deadline: Date, now: Date): { deadlinePt: string; closingLabelPt: string } => {
  const includeYear = ptYearFormatter.format(deadline) !== ptYearFormatter.format(now);
  const yearSuffix = includeYear ? `, ${ptYearFormatter.format(deadline)}` : "";
  const formattedDate = `${ptDateFormatter.format(deadline)}${yearSuffix}, ${ptTimeFormatter.format(deadline)} PT`;

  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs > 0 && remainingMs <= MS_PER_DAY) {
    const totalMinutes = Math.max(1, Math.round(remainingMs / MS_PER_MINUTE));
    if (totalMinutes < 60) {
      return {
        deadlinePt: formattedDate,
        closingLabelPt: `Closes in ${totalMinutes} min · ${formattedDate}`,
      };
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const relative = minutes > 0 ? `Closes in ${hours} h ${minutes} min` : `Closes in ${hours} h`;
    return {
      deadlinePt: formattedDate,
      closingLabelPt: `${relative} · ${formattedDate}`,
    };
  }

  return {
    deadlinePt: formattedDate,
    closingLabelPt: `${remainingMs > 0 ? "Closes" : "Closed"} ${formattedDate}`,
  };
};

const toArenaQuestion = (
  question: StoredQuestion,
  now: Date,
  hotQuestionIds: ReadonlySet<string>,
): ArenaQuestion => {
  const status = computeQuestionStatus(question, now);
  const { deadlinePt, closingLabelPt } = formatPacificDeadline(question.deadline, now);
  const isHot = hotQuestionIds.has(question.id);

  if (question.type === "AB") {
    const first = question.answers[0];
    const second = question.answers[1];
    if (!first || !second) {
      throw new Error(`A/B question "${question.id}" must have 2 answers.`);
    }
    const [priceA, priceB] = computeDisplayedAbPrices(
      question.startingPriceA ?? 50,
      question.sharesA ?? 0,
      question.sharesB ?? 0,
    );

    return {
      id: question.id,
      title: question.title,
      category: question.category,
      type: "AB",
      status,
      isHot,
      deadline: question.deadline.toISOString(),
      deadlinePt,
      closingLabelPt,
      totalCredits: question.totalCredits,
      criteria: question.criteria,
      source: question.source,
      correctAnswerId: question.correctAnswerId,
      answers: [
        { id: first.id, label: first.label, price: priceA },
        { id: second.id, label: second.label, price: priceB },
      ],
    };
  }

  const totalPool = question.answers.reduce((sum, answer) => sum + answer.credits, 0);
  const sortedAnswers: MultiAnswerItem[] = [...question.answers]
    .sort((left, right) => right.credits - left.credits)
    .map((answer) => ({
      id: answer.id,
      label: answer.label,
      credits: answer.credits,
      sharePercent: totalPool > 0 ? Math.round((answer.credits / totalPool) * 100) : 0,
    }));

  const topAnswers =
    status === "RESOLVED" && question.correctAnswerId
      ? [
          ...sortedAnswers.filter((answer) => answer.id === question.correctAnswerId),
          ...sortedAnswers.filter((answer) => answer.id !== question.correctAnswerId),
        ].slice(0, 3)
      : sortedAnswers.slice(0, 3);

  return {
    id: question.id,
    title: question.title,
    category: question.category,
    type: "MULTI",
    status,
    isHot,
    deadline: question.deadline.toISOString(),
    deadlinePt,
    closingLabelPt,
    totalCredits: totalPool,
    criteria: question.criteria,
    source: question.source,
    correctAnswerId: question.correctAnswerId,
    topAnswers,
    answers: sortedAnswers,
    totalAnswerCount: sortedAnswers.length,
  };
};

export const listArenaQuestions = async (
  store: ArenaQuestionStore,
  query: ArenaQuestionsQuery,
  now: Date,
): Promise<ArenaQuestionsResponse> => {
  const [rawCategories, rawQuestions] = await Promise.all([
    store.getCategories(),
    store.getQuestions(),
  ]);

  // US-2 AC 6: Hidden questions and drafts do not appear for Users or visitors.
  const publishedQuestions = rawQuestions.filter(
    (question) => question.visibility === "PUBLISHED",
  );

  // Hot questions: top 3 open questions with the most credits spent in the last 24 hours.
  const hotQuestionIds = new Set(
    publishedQuestions
      .filter((question) => {
        const status = computeQuestionStatus(question, now);
        return (status === "OPEN" || status === "CLOSING_SOON") && question.creditsLast24h > 0;
      })
      .sort((left, right) => right.creditsLast24h - left.creditsLast24h)
      .slice(0, 3)
      .map((question) => question.id),
  );

  const selectedCategories = new Set(
    query.category.map((category) => category.toLowerCase()),
  );

  const matchesCategoryAndType = (question: StoredQuestion): boolean => {
    if (
      selectedCategories.size > 0 &&
      !selectedCategories.has(question.category.toLowerCase())
    ) {
      return false;
    }
    if (query.type && question.type !== query.type) {
      return false;
    }
    return true;
  };

  const categoryFiltered = publishedQuestions.filter(matchesCategoryAndType);

  const statusCounts: ArenaStatusCounts = {
    OPEN: 0,
    CLOSING_SOON: 0,
    CLOSED: 0,
    RESOLVED: 0,
    CANCELLED: 0,
  };

  for (const status of QUESTION_STATUS_VALUES) {
    statusCounts[status] = categoryFiltered.filter((question) =>
      matchesStatusFilter(computeQuestionStatus(question, now), [status]),
    ).length;
  }

  const matchingQuestions = categoryFiltered.filter((question) =>
    matchesStatusFilter(computeQuestionStatus(question, now), query.status),
  );

  // US-2 AC 1: Open questions sorted by soonest deadline first; past questions sorted by most recent deadline first.
  const upcoming = matchingQuestions
    .filter((question) => question.deadline.getTime() > now.getTime())
    .sort((left, right) => left.deadline.getTime() - right.deadline.getTime());

  const past = matchingQuestions
    .filter((question) => question.deadline.getTime() <= now.getTime())
    .sort((left, right) => right.deadline.getTime() - left.deadline.getTime());

  const questions = [...upcoming, ...past].map((question) =>
    toArenaQuestion(question, now, hotQuestionIds),
  );

  return {
    questions,
    categories: rawCategories,
    statusCounts,
  };
};

export const buildSeedQuestions = (referenceTime: Date): StoredQuestion[] => {
  const baseMs = Math.ceil(referenceTime.getTime() / MS_PER_HOUR) * MS_PER_HOUR;
  const atOffset = (offsetMs: number): Date => new Date(baseMs + offsetMs);

  const makeAb = (params: {
    id: string;
    title: string;
    category: string;
    offsetMs: number;
    answers: [string, string];
    startingPriceA?: number;
    targetPriceA: number;
    totalCredits: number;
    creditsLast24h: number;
    criteria: string;
    source: string;
    visibility?: QuestionVisibility;
    resolution?: QuestionResolution;
    correctIndex?: 0 | 1;
  }): StoredQuestion => {
    const startingPriceA = params.startingPriceA ?? 50;
    const [sharesA, sharesB] = sharesForTargetPrice(startingPriceA, params.targetPriceA);
    const answerAId = `${params.id}-a`;
    const answerBId = `${params.id}-b`;
    return {
      id: params.id,
      title: params.title,
      category: params.category,
      type: "AB",
      visibility: params.visibility ?? "PUBLISHED",
      resolution: params.resolution ?? "UNRESOLVED",
      deadline: atOffset(params.offsetMs),
      criteria: params.criteria,
      source: params.source,
      startingPriceA,
      sharesA,
      sharesB,
      totalCredits: params.totalCredits,
      creditsLast24h: params.creditsLast24h,
      correctAnswerId:
        params.correctIndex === 0
          ? answerAId
          : params.correctIndex === 1
            ? answerBId
            : null,
      answers: [
        { id: answerAId, label: params.answers[0], credits: 0 },
        { id: answerBId, label: params.answers[1], credits: 0 },
      ],
    };
  };

  const makeMulti = (params: {
    id: string;
    title: string;
    category: string;
    offsetMs: number;
    answers: Array<[string, number]>;
    creditsLast24h: number;
    criteria: string;
    source: string;
    visibility?: QuestionVisibility;
    resolution?: QuestionResolution;
    correctIndex?: number;
  }): StoredQuestion => {
    const storedAnswers: StoredAnswer[] = params.answers.map(([label, credits], index) => ({
      id: `${params.id}-opt-${index + 1}`,
      label,
      credits,
    }));
    const totalCredits = storedAnswers.reduce((sum, item) => sum + item.credits, 0);
    return {
      id: params.id,
      title: params.title,
      category: params.category,
      type: "MULTI",
      visibility: params.visibility ?? "PUBLISHED",
      resolution: params.resolution ?? "UNRESOLVED",
      deadline: atOffset(params.offsetMs),
      criteria: params.criteria,
      source: params.source,
      totalCredits,
      creditsLast24h: params.creditsLast24h,
      correctAnswerId:
        params.correctIndex !== undefined
          ? (storedAnswers[params.correctIndex]?.id ?? null)
          : null,
      answers: storedAnswers,
    };
  };

  return [
    makeAb({
      id: "q1",
      title: "Will more than 80 students attend the industry panel?",
      category: "Campus Events",
      offsetMs: 3 * MS_PER_HOUR,
      answers: ["Yes", "No"],
      targetPriceA: 0.62,
      totalCredits: 1840,
      creditsLast24h: 910,
      criteria: "Resolves Yes if the check-in count at the start of the panel is more than 80 students.",
      source: "Career Center check-in sheet",
    }),
    makeAb({
      id: "q2",
      title: "Will it rain in San Jose tomorrow?",
      category: "Weather & Climate",
      offsetMs: 6 * MS_PER_HOUR,
      answers: ["Yes", "No"],
      startingPriceA: 40,
      targetPriceA: 0.27,
      totalCredits: 960,
      creditsLast24h: 420,
      criteria: "Resolves Yes if at least 0.01 inch of rain is recorded at San Jose airport (SJC) on that calendar day.",
      source: "National Weather Service daily climate report for SJC",
    }),
    makeMulti({
      id: "q3",
      title: "Who will arrive first to the CS 301 lecture?",
      category: "Campus Events",
      offsetMs: 14 * MS_PER_HOUR,
      answers: [
        ["Maya", 320],
        ["Jordan", 210],
        ["Priya", 140],
        ["Leo", 60],
        ["Other", 30],
      ],
      creditsLast24h: 380,
      criteria: "Resolves to the first listed student to enter the lecture hall. Resolves Other if anyone else arrives first.",
      source: "TA attendance log",
    }),
    makeAb({
      id: "q4",
      title: "Will Bitcoin trade above $120,000 when this question closes?",
      category: "Crypto",
      offsetMs: 20 * MS_PER_HOUR,
      answers: ["Yes", "No"],
      startingPriceA: 45,
      targetPriceA: 0.41,
      totalCredits: 3120,
      creditsLast24h: 1450,
      criteria: "Resolves Yes if the BTC/USD price is above $120,000 at the moment predictions close.",
      source: "CoinGecko BTC/USD price",
    }),
    makeAb({
      id: "q5",
      title: "Dodgers or Yankees: who will win Game 1?",
      category: "Sports",
      offsetMs: 30 * MS_PER_HOUR,
      answers: ["Dodgers", "Yankees"],
      targetPriceA: 0.674,
      totalCredits: 5480,
      creditsLast24h: 2210,
      criteria: "Resolves to the team that wins Game 1, including extra innings.",
      source: "MLB.com official box score",
    }),
    makeMulti({
      id: "q6",
      title: "Which movie will top the box office this weekend?",
      category: "Culture & Entertainment",
      offsetMs: 2 * MS_PER_DAY + 4 * MS_PER_HOUR,
      answers: [
        ["Starfall", 860],
        ["The Long Field", 540],
        ["Paper Moons", 290],
        ["Other", 110],
      ],
      creditsLast24h: 300,
      criteria: "Resolves to the film with the highest domestic gross for the Friday to Sunday weekend.",
      source: "Box Office Mojo weekend chart",
    }),
    makeAb({
      id: "q7",
      title: "Will the 49ers beat the Seahawks on Sunday?",
      category: "Sports",
      offsetMs: 4 * MS_PER_DAY + 2 * MS_PER_HOUR,
      answers: ["49ers", "Seahawks"],
      targetPriceA: 0.58,
      totalCredits: 2650,
      creditsLast24h: 640,
      criteria: "Resolves to the team that wins the game, including overtime.",
      source: "NFL.com final score",
    }),
    makeMulti({
      id: "q8",
      title: "Which song will be No. 1 on the Billboard Hot 100 next week?",
      category: "Culture & Entertainment",
      offsetMs: 5 * MS_PER_DAY,
      answers: [
        ["Neon Hearts", 410],
        ["Golden Hour Again", 380],
        ["Driftwood", 150],
        ["Other", 60],
      ],
      creditsLast24h: 120,
      criteria: "Resolves to the No. 1 song on the official Billboard Hot 100 chart.",
      source: "Billboard Hot 100 official chart",
    }),
    makeAb({
      id: "q9",
      title: "Will the city council approve the new downtown bike lane plan?",
      category: "Politics",
      offsetMs: 14 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.71,
      totalCredits: 780,
      creditsLast24h: 40,
      criteria: "Resolves Yes if the city council votes to approve the bike lane resolution.",
      source: "City Council official minutes",
    }),
    makeAb({
      id: "q10",
      title: "Will the campus library extend its finals-week hours?",
      category: "Campus Events",
      offsetMs: 20 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.83,
      totalCredits: 520,
      creditsLast24h: 30,
      criteria: "Resolves Yes if university library management announces 24-hour finals-week access.",
      source: "University Library announcement",
    }),
    makeAb({
      id: "q11",
      title: "Will the average gas price in California be above $6.00 on December 1?",
      category: "Economics",
      offsetMs: 33 * MS_PER_DAY,
      answers: ["Yes", "No"],
      startingPriceA: 40,
      targetPriceA: 0.36,
      totalCredits: 2240,
      creditsLast24h: 180,
      criteria: "Resolves Yes if the AAA California average price for regular gas on December 1 is above $6.00.",
      source: "AAA Gas Prices, California",
    }),
    makeAb({
      id: "q12",
      title: "Will the Federal Reserve cut interest rates at its December meeting?",
      category: "Economics",
      offsetMs: 40 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.55,
      totalCredits: 1990,
      creditsLast24h: 260,
      criteria: "Resolves Yes if the Federal Reserve lowers its target range for the federal funds rate at the December meeting.",
      source: "Federal Reserve press release",
    }),
    makeAb({
      id: "q13",
      title: "Will a new crewed Moon mission launch before the end of the year?",
      category: "Tech & Science",
      offsetMs: 50 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.18,
      totalCredits: 640,
      creditsLast24h: 0,
      criteria: "Resolves Yes if a crewed spacecraft launches on a lunar mission before Jan 1.",
      source: "NASA official mission log",
    }),
    makeAb({
      id: "q14",
      title: "Will Apple stock close the year above $250?",
      category: "Financials",
      offsetMs: 60 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.47,
      totalCredits: 1310,
      creditsLast24h: 90,
      criteria: "Resolves Yes if AAPL official closing price on the final trading day of the year is above $250.00.",
      source: "NASDAQ official close",
    }),
    makeAb({
      id: "q15",
      title: "Will Tesla report more than 500,000 deliveries for Q4?",
      category: "Companies",
      offsetMs: 70 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.39,
      totalCredits: 880,
      creditsLast24h: 20,
      criteria: "Resolves Yes if Tesla's Q4 production and deliveries press release reports over 500,000 total deliveries.",
      source: "Tesla Investor Relations",
    }),
    makeMulti({
      id: "q16",
      title: "Which country will win the next World Cup?",
      category: "Sports",
      offsetMs: 200 * MS_PER_DAY,
      answers: [
        ["Brazil", 420],
        ["France", 250],
        ["Argentina", 180],
        ["England", 70],
        ["Spain", 50],
        ["Other", 30],
      ],
      creditsLast24h: 150,
      criteria: "Resolves to the country that wins the final.",
      source: "FIFA.com",
    }),
    makeAb({
      id: "q17",
      title: "Will it be over 80°F in San Jose on Monday afternoon?",
      category: "Weather & Climate",
      offsetMs: -30 * MS_PER_HOUR,
      answers: ["Yes", "No"],
      targetPriceA: 0.44,
      totalCredits: 700,
      creditsLast24h: 0,
      criteria: "Resolves Yes if SJC records a daily high above 80°F.",
      source: "National Weather Service",
    }),
    makeAb({
      id: "q18",
      title: "Will the Warriors win their next home game?",
      category: "Sports",
      offsetMs: -10 * MS_PER_HOUR,
      answers: ["Yes", "No"],
      targetPriceA: 0.61,
      totalCredits: 1520,
      creditsLast24h: 0,
      criteria: "Resolves Yes if Golden State wins the game.",
      source: "NBA.com official box score",
    }),
    makeAb({
      id: "q19",
      title: "Will the fall hackathon get more than 200 sign-ups?",
      category: "Campus Events",
      offsetMs: -3 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.52,
      totalCredits: 1100,
      creditsLast24h: 0,
      resolution: "RESOLVED",
      correctIndex: 0,
      criteria: "Resolves Yes if total registered participants exceed 200.",
      source: "Hackathon organizer registration sheet",
    }),
    makeMulti({
      id: "q20",
      title: "Which dorm will win the homecoming spirit contest?",
      category: "Campus Events",
      offsetMs: -6 * MS_PER_DAY,
      answers: [
        ["North Hall", 540],
        ["Cedar House", 380],
        ["West Tower", 200],
      ],
      creditsLast24h: 0,
      resolution: "RESOLVED",
      correctIndex: 1,
      criteria: "Resolves to the dorm announced as winner by Student Affairs.",
      source: "Student Affairs homecoming results",
    }),
    makeAb({
      id: "q21",
      title: "Will the outdoor movie night draw more than 100 people?",
      category: "Campus Events",
      offsetMs: -2 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.48,
      totalCredits: 430,
      creditsLast24h: 0,
      resolution: "CANCELLED",
      criteria: "Resolves Yes if headcount exceeds 100.",
      source: "Campus Events committee",
    }),
    makeAb({
      id: "q22",
      title: "Hidden question (should not appear)",
      category: "Sports",
      offsetMs: 9 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.5,
      totalCredits: 0,
      creditsLast24h: 0,
      visibility: "HIDDEN",
      criteria: "Hidden question test.",
      source: "Internal",
    }),
    makeAb({
      id: "q23",
      title: "Draft question (should not appear)",
      category: "Campus Events",
      offsetMs: 9 * MS_PER_DAY,
      answers: ["Yes", "No"],
      targetPriceA: 0.5,
      totalCredits: 0,
      creditsLast24h: 0,
      visibility: "DRAFT",
      criteria: "Draft question test.",
      source: "Internal",
    }),
  ];
};

export const createInMemoryArenaStore = (
  options?: {
    categories?: string[];
    questions?: StoredQuestion[];
    referenceTime?: Date;
  },
): ArenaQuestionStore => {
  const categories = options?.categories ?? [...DEFAULT_CATEGORIES];
  const questions =
    options?.questions ?? buildSeedQuestions(options?.referenceTime ?? new Date());

  return {
    getCategories: () => categories,
    getQuestions: () => questions,
  };
};
