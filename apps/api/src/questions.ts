import {
  DEFAULT_CATEGORIES,
  type ArenaQuestion,
  type ArenaQuestionsQuery,
  type ArenaQuestionsResponse,
  type QuestionLifecycle,
  type QuestionStatus,
  type QuestionType,
  type StatusCounts,
  clampDisplayedPriceA,
} from "@forecasthub/shared";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface StoredAnswerRecord {
  id: string;
  label: string;
  credits?: number;
}

export interface StoredQuestionRecord {
  id: string;
  title: string;
  category: string;
  type: QuestionType;
  lifecycle: QuestionLifecycle;
  deadline: Date;
  criteria: string;
  source: string;
  probabilityA?: number;
  totalCredits: number;
  credits24h: number;
  answers: StoredAnswerRecord[];
  correctAnswerId?: string | null;
}

export interface QuestionRepository {
  listQuestions(
    query: ArenaQuestionsQuery,
    now?: Date,
  ): Promise<ArenaQuestionsResponse>;
}

export function createDefaultSeedQuestions(referenceTime: Date = new Date()): StoredQuestionRecord[] {
  const baseMs = Math.ceil(referenceTime.getTime() / HOUR_MS) * HOUR_MS;
  const atOffset = (offsetMs: number) => new Date(baseMs + offsetMs);

  return [
    {
      id: "q1",
      title: "Will more than 80 students attend the industry panel?",
      category: "Campus Events",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(3 * HOUR_MS),
      criteria: "Resolves Yes if the check-in count at the start of the panel is more than 80 students.",
      source: "Career Center check-in sheet",
      probabilityA: 0.62,
      totalCredits: 1840,
      credits24h: 910,
      answers: [
        { id: "q1-a", label: "Yes" },
        { id: "q1-b", label: "No" },
      ],
    },
    {
      id: "q2",
      title: "Will it rain in San Jose tomorrow?",
      category: "Weather & Climate",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(6 * HOUR_MS),
      criteria: "Resolves Yes if at least 0.01 inch of rain is recorded at San Jose airport (SJC) on that calendar day.",
      source: "National Weather Service daily climate report for SJC",
      probabilityA: 0.27,
      totalCredits: 960,
      credits24h: 420,
      answers: [
        { id: "q2-a", label: "Yes" },
        { id: "q2-b", label: "No" },
      ],
    },
    {
      id: "q3",
      title: "Who will arrive first to the CS 301 lecture?",
      category: "Campus Events",
      type: "MULTI",
      lifecycle: "PUBLISHED",
      deadline: atOffset(14 * HOUR_MS),
      criteria: "Resolves to the first listed student to enter the lecture hall. Resolves Other if anyone else arrives first.",
      source: "TA attendance log",
      totalCredits: 760,
      credits24h: 380,
      answers: [
        { id: "q3-1", label: "Maya", credits: 320 },
        { id: "q3-2", label: "Jordan", credits: 210 },
        { id: "q3-3", label: "Priya", credits: 140 },
        { id: "q3-4", label: "Leo", credits: 60 },
        { id: "q3-5", label: "Other", credits: 30 },
      ],
    },
    {
      id: "q4",
      title: "Will Bitcoin trade above $120,000 when this question closes?",
      category: "Crypto",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(20 * HOUR_MS),
      criteria: "Resolves Yes if the BTC/USD price is above $120,000 at the moment predictions close.",
      source: "CoinGecko BTC/USD price",
      probabilityA: 0.41,
      totalCredits: 3120,
      credits24h: 1450,
      answers: [
        { id: "q4-a", label: "Yes" },
        { id: "q4-b", label: "No" },
      ],
    },
    {
      id: "q5",
      title: "Dodgers or Yankees: who will win Game 1?",
      category: "Sports",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(30 * HOUR_MS),
      criteria: "Resolves to the team that wins Game 1, including extra innings.",
      source: "MLB.com official box score",
      probabilityA: 0.674,
      totalCredits: 5480,
      credits24h: 2210,
      answers: [
        { id: "q5-a", label: "Dodgers" },
        { id: "q5-b", label: "Yankees" },
      ],
    },
    {
      id: "q6",
      title: "Which movie will top the box office this weekend?",
      category: "Culture & Entertainment",
      type: "MULTI",
      lifecycle: "PUBLISHED",
      deadline: atOffset(2 * DAY_MS + 4 * HOUR_MS),
      criteria: "Resolves to the film with the highest domestic gross for the Friday to Sunday weekend.",
      source: "Box Office Mojo weekend chart",
      totalCredits: 1800,
      credits24h: 300,
      answers: [
        { id: "q6-1", label: "Starfall", credits: 860 },
        { id: "q6-2", label: "The Long Field", credits: 540 },
        { id: "q6-3", label: "Paper Moons", credits: 290 },
        { id: "q6-4", label: "Other", credits: 110 },
      ],
    },
    {
      id: "q7",
      title: "Will the 49ers beat the Seahawks on Sunday?",
      category: "Sports",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(4 * DAY_MS + 2 * HOUR_MS),
      criteria: "Resolves to the team that wins the game, including overtime.",
      source: "NFL.com final score",
      probabilityA: 0.58,
      totalCredits: 2650,
      credits24h: 640,
      answers: [
        { id: "q7-a", label: "49ers" },
        { id: "q7-b", label: "Seahawks" },
      ],
    },
    {
      id: "q8",
      title: "Which song will be No. 1 on the Billboard Hot 100 next week?",
      category: "Culture & Entertainment",
      type: "MULTI",
      lifecycle: "PUBLISHED",
      deadline: atOffset(5 * DAY_MS),
      criteria: "Resolves to the song ranked No. 1 on the official Billboard Hot 100 chart next week.",
      source: "Billboard Hot 100 chart",
      totalCredits: 1000,
      credits24h: 120,
      answers: [
        { id: "q8-1", label: "Neon Hearts", credits: 410 },
        { id: "q8-2", label: "Golden Hour Again", credits: 380 },
        { id: "q8-3", label: "Driftwood", credits: 150 },
        { id: "q8-4", label: "Other", credits: 60 },
      ],
    },
    {
      id: "q9",
      title: "Will the city council approve the new downtown bike lane plan?",
      category: "Politics",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(14 * DAY_MS),
      criteria: "Resolves Yes if the city council passes the downtown bike lane ordinance at its scheduled vote.",
      source: "City Council meeting minutes",
      probabilityA: 0.71,
      totalCredits: 780,
      credits24h: 40,
      answers: [
        { id: "q9-a", label: "Yes" },
        { id: "q9-b", label: "No" },
      ],
    },
    {
      id: "q10",
      title: "Will the campus library extend its finals-week hours?",
      category: "Campus Events",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(20 * DAY_MS),
      criteria: "Resolves Yes if the main campus library announces 24-hour access during finals week.",
      source: "University Library announcement",
      probabilityA: 0.83,
      totalCredits: 520,
      credits24h: 30,
      answers: [
        { id: "q10-a", label: "Yes" },
        { id: "q10-b", label: "No" },
      ],
    },
    {
      id: "q11",
      title: "Will the average gas price in California be above $6.00 on December 1?",
      category: "Economics",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(33 * DAY_MS),
      criteria: "Resolves Yes if the AAA California average price for regular gas on December 1 is above $6.00.",
      source: "AAA Gas Prices, California",
      probabilityA: 0.36,
      totalCredits: 2240,
      credits24h: 180,
      answers: [
        { id: "q11-a", label: "Yes" },
        { id: "q11-b", label: "No" },
      ],
    },
    {
      id: "q12",
      title: "Will the Federal Reserve cut interest rates at its December meeting?",
      category: "Economics",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(40 * DAY_MS),
      criteria: "Resolves Yes if the Federal Reserve lowers its target range for the federal funds rate at the December meeting.",
      source: "Federal Reserve press release",
      probabilityA: 0.55,
      totalCredits: 1990,
      credits24h: 260,
      answers: [
        { id: "q12-a", label: "Yes" },
        { id: "q12-b", label: "No" },
      ],
    },
    {
      id: "q13",
      title: "Will a new crewed Moon mission launch before the end of the year?",
      category: "Tech & Science",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(50 * DAY_MS),
      criteria: "Resolves Yes if a crewed spacecraft launches on a lunar mission before December 31 at 11:59 PM PT.",
      source: "NASA official mission log",
      probabilityA: 0.18,
      totalCredits: 640,
      credits24h: 0,
      answers: [
        { id: "q13-a", label: "Yes" },
        { id: "q13-b", label: "No" },
      ],
    },
    {
      id: "q14",
      title: "Will Apple stock close the year above $250?",
      category: "Financials",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(60 * DAY_MS),
      criteria: "Resolves Yes if AAPL closing price on the final trading day of the year is strictly above $250.00.",
      source: "Nasdaq official closing price",
      probabilityA: 0.47,
      totalCredits: 1310,
      credits24h: 90,
      answers: [
        { id: "q14-a", label: "Yes" },
        { id: "q14-b", label: "No" },
      ],
    },
    {
      id: "q15",
      title: "Will Tesla report more than 500,000 deliveries for Q4?",
      category: "Companies",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(70 * DAY_MS),
      criteria: "Resolves Yes if Tesla's Q4 production and deliveries report states more than 500,000 total deliveries.",
      source: "Tesla Investor Relations release",
      probabilityA: 0.39,
      totalCredits: 880,
      credits24h: 20,
      answers: [
        { id: "q15-a", label: "Yes" },
        { id: "q15-b", label: "No" },
      ],
    },
    {
      id: "q16",
      title: "Which country will win the next World Cup?",
      category: "Sports",
      type: "MULTI",
      lifecycle: "PUBLISHED",
      deadline: atOffset(200 * DAY_MS),
      criteria: "Resolves to the country that wins the FIFA World Cup final.",
      source: "FIFA.com",
      totalCredits: 1000,
      credits24h: 150,
      answers: [
        { id: "q16-1", label: "Brazil", credits: 420 },
        { id: "q16-2", label: "France", credits: 250 },
        { id: "q16-3", label: "Argentina", credits: 160 },
        { id: "q16-4", label: "England", credits: 90 },
        { id: "q16-5", label: "Spain", credits: 50 },
        { id: "q16-6", label: "Other", credits: 30 },
      ],
    },
    {
      id: "q17",
      title: "Will it be over 80°F in San Jose on Monday afternoon?",
      category: "Weather & Climate",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(-30 * HOUR_MS),
      criteria: "Resolves Yes if the daily high temperature at SJC reaches above 80°F.",
      source: "National Weather Service",
      probabilityA: 0.44,
      totalCredits: 700,
      credits24h: 0,
      answers: [
        { id: "q17-a", label: "Yes" },
        { id: "q17-b", label: "No" },
      ],
    },
    {
      id: "q18",
      title: "Will the Warriors win their next home game?",
      category: "Sports",
      type: "AB",
      lifecycle: "PUBLISHED",
      deadline: atOffset(-10 * HOUR_MS),
      criteria: "Resolves Yes if the Golden State Warriors win the game.",
      source: "NBA.com official box score",
      probabilityA: 0.61,
      totalCredits: 1520,
      credits24h: 0,
      answers: [
        { id: "q18-a", label: "Yes" },
        { id: "q18-b", label: "No" },
      ],
    },
    {
      id: "q19",
      title: "Will the fall hackathon get more than 200 sign-ups?",
      category: "Campus Events",
      type: "AB",
      lifecycle: "RESOLVED",
      deadline: atOffset(-3 * DAY_MS),
      criteria: "Resolves Yes if official hackathon registration exceeds 200 students by the deadline.",
      source: "Hackathon organizer registration dashboard",
      probabilityA: 0.52,
      totalCredits: 1100,
      credits24h: 0,
      correctAnswerId: "q19-a",
      answers: [
        { id: "q19-a", label: "Yes" },
        { id: "q19-b", label: "No" },
      ],
    },
    {
      id: "q20",
      title: "Which dorm will win the homecoming spirit contest?",
      category: "Campus Events",
      type: "MULTI",
      lifecycle: "RESOLVED",
      deadline: atOffset(-6 * DAY_MS),
      criteria: "Resolves to the residence hall announced as winner by Student Affairs.",
      source: "Student Affairs homecoming results",
      totalCredits: 1120,
      credits24h: 0,
      correctAnswerId: "q20-2",
      answers: [
        { id: "q20-1", label: "North Hall", credits: 540 },
        { id: "q20-2", label: "Cedar House", credits: 380 },
        { id: "q20-3", label: "West Tower", credits: 200 },
      ],
    },
    {
      id: "q21",
      title: "Will the outdoor movie night draw more than 100 people?",
      category: "Campus Events",
      type: "AB",
      lifecycle: "CANCELLED",
      deadline: atOffset(-2 * DAY_MS),
      criteria: "Resolves Yes if headcount exceeds 100 attendees.",
      source: "Campus Events Committee",
      probabilityA: 0.48,
      totalCredits: 430,
      credits24h: 0,
      answers: [
        { id: "q21-a", label: "Yes" },
        { id: "q21-b", label: "No" },
      ],
    },
    {
      id: "q22",
      title: "Hidden question (should not appear)",
      category: "Sports",
      type: "AB",
      lifecycle: "HIDDEN",
      deadline: atOffset(9 * DAY_MS),
      criteria: "Hidden question for moderation testing.",
      source: "Internal test",
      probabilityA: 0.5,
      totalCredits: 0,
      credits24h: 0,
      answers: [
        { id: "q22-a", label: "Yes" },
        { id: "q22-b", label: "No" },
      ],
    },
    {
      id: "q23",
      title: "Draft question (should not appear)",
      category: "Campus Events",
      type: "AB",
      lifecycle: "DRAFT",
      deadline: atOffset(9 * DAY_MS),
      criteria: "Draft question not yet published.",
      source: "Internal test",
      probabilityA: 0.5,
      totalCredits: 0,
      credits24h: 0,
      answers: [
        { id: "q23-a", label: "Yes" },
        { id: "q23-b", label: "No" },
      ],
    },
  ];
}

export function deriveQuestionStatus(
  question: Pick<StoredQuestionRecord, "lifecycle" | "deadline">,
  now: Date,
): QuestionStatus {
  if (question.lifecycle === "CANCELLED") {
    return "CANCELLED";
  }
  if (question.lifecycle === "RESOLVED") {
    return "RESOLVED";
  }
  const remainingMs = question.deadline.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return "CLOSED";
  }
  if (remainingMs <= DAY_MS) {
    return "CLOSING_SOON";
  }
  return "OPEN";
}

export function matchesStatusSelection(
  status: QuestionStatus,
  selectedStatuses: readonly QuestionStatus[],
): boolean {
  const effectiveStatuses =
    selectedStatuses.length > 0 ? selectedStatuses : (["OPEN"] as const);
  if (effectiveStatuses.includes(status)) {
    return true;
  }
  if (status === "CLOSING_SOON" && effectiveStatuses.includes("OPEN")) {
    return true;
  }
  return false;
}

function toArenaQuestion(
  record: StoredQuestionRecord,
  status: QuestionStatus,
  isHot: boolean,
): ArenaQuestion {
  const correctAnswer =
    record.correctAnswerId != null
      ? record.answers.find((answer) => answer.id === record.correctAnswerId)
      : undefined;

  if (record.type === "AB") {
    const first = record.answers[0] ?? { id: `${record.id}-a`, label: "Yes" };
    const second = record.answers[1] ?? { id: `${record.id}-b`, label: "No" };
    const priceA = clampDisplayedPriceA(record.probabilityA ?? 0.5);
    const priceB = 100 - priceA;

    return {
      id: record.id,
      title: record.title,
      category: record.category,
      type: "AB",
      status,
      deadline: record.deadline.toISOString(),
      totalCredits: record.totalCredits,
      isHot,
      answers: [
        {
          id: first.id,
          label: first.label,
          price: priceA,
          ...(status === "RESOLVED"
            ? { isCorrect: record.correctAnswerId === first.id }
            : {}),
        },
        {
          id: second.id,
          label: second.label,
          price: priceB,
          ...(status === "RESOLVED"
            ? { isCorrect: record.correctAnswerId === second.id }
            : {}),
        },
      ],
      totalAnswerCount: 2,
      correctAnswerId: record.correctAnswerId ?? null,
      correctAnswerLabel: correctAnswer?.label ?? null,
      criteria: record.criteria,
      source: record.source,
    };
  }

  const totalCredits =
    record.answers.reduce((sum, answer) => sum + (answer.credits ?? 0), 0) ||
    record.totalCredits;

  const sortedAnswers = record.answers
    .map((answer, index) => ({
      ...answer,
      credits: answer.credits ?? 0,
      index,
    }))
    .sort((a, b) => b.credits - a.credits || a.index - b.index);

  const topThree =
    status === "RESOLVED" && record.correctAnswerId
      ? [
          ...sortedAnswers.filter((a) => a.id === record.correctAnswerId),
          ...sortedAnswers.filter((a) => a.id !== record.correctAnswerId),
        ].slice(0, 3)
      : sortedAnswers.slice(0, 3);

  return {
    id: record.id,
    title: record.title,
    category: record.category,
    type: "MULTI",
    status,
    deadline: record.deadline.toISOString(),
    totalCredits,
    isHot,
    answers: topThree.map((answer) => ({
      id: answer.id,
      label: answer.label,
      credits: answer.credits,
      sharePct:
        totalCredits > 0 ? Math.round((answer.credits / totalCredits) * 100) : 0,
      ...(status === "RESOLVED"
        ? { isCorrect: record.correctAnswerId === answer.id }
        : {}),
    })),
    totalAnswerCount: record.answers.length,
    correctAnswerId: record.correctAnswerId ?? null,
    correctAnswerLabel: correctAnswer?.label ?? null,
    criteria: record.criteria,
    source: record.source,
  };
}

export class InMemoryQuestionRepository implements QuestionRepository {
  private readonly questions: StoredQuestionRecord[];
  private readonly categories: string[];

  constructor(
    questions: StoredQuestionRecord[] = createDefaultSeedQuestions(),
    categories: readonly string[] = DEFAULT_CATEGORIES,
  ) {
    this.questions = questions;
    this.categories = [...categories];
  }

  async listQuestions(
    query: ArenaQuestionsQuery,
    now: Date = new Date(),
  ): Promise<ArenaQuestionsResponse> {
    const visibleQuestions = this.questions.filter(
      (q) => q.lifecycle !== "DRAFT" && q.lifecycle !== "HIDDEN",
    );

    const hotIds = new Set(
      visibleQuestions
        .filter((q) => {
          const status = deriveQuestionStatus(q, now);
          return (
            (status === "OPEN" || status === "CLOSING_SOON") && q.credits24h > 0
          );
        })
        .sort((a, b) => b.credits24h - a.credits24h)
        .slice(0, 3)
        .map((q) => q.id),
    );

    const categorySet = new Set(
      query.categories.map((category) => category.toLowerCase()),
    );

    const scopedByCategoryAndType = visibleQuestions.filter((q) => {
      if (
        categorySet.size > 0 &&
        !categorySet.has(q.category.toLowerCase())
      ) {
        return false;
      }
      if (query.type && q.type !== query.type) {
        return false;
      }
      return true;
    });

    const countsByStatus: StatusCounts = {
      OPEN: 0,
      CLOSING_SOON: 0,
      CLOSED: 0,
      RESOLVED: 0,
      CANCELLED: 0,
    };

    for (const q of scopedByCategoryAndType) {
      const status = deriveQuestionStatus(q, now);
      if (status === "OPEN") {
        countsByStatus.OPEN += 1;
      } else if (status === "CLOSING_SOON") {
        countsByStatus.OPEN += 1;
        countsByStatus.CLOSING_SOON += 1;
      } else if (status === "CLOSED") {
        countsByStatus.CLOSED += 1;
      } else if (status === "RESOLVED") {
        countsByStatus.RESOLVED += 1;
      } else if (status === "CANCELLED") {
        countsByStatus.CANCELLED += 1;
      }
    }

    const matching = scopedByCategoryAndType.filter((q) => {
      const status = deriveQuestionStatus(q, now);
      return matchesStatusSelection(status, query.statuses);
    });

    const nowMs = now.getTime();
    const upcoming = matching
      .filter((q) => q.deadline.getTime() > nowMs)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    const past = matching
      .filter((q) => q.deadline.getTime() <= nowMs)
      .sort((a, b) => b.deadline.getTime() - a.deadline.getTime());

    const ordered = [...upcoming, ...past].map((q) => {
      const status = deriveQuestionStatus(q, now);
      return toArenaQuestion(q, status, hotIds.has(q.id));
    });

    return {
      questions: ordered,
      categories: this.categories,
      countsByStatus,
    };
  }
}
