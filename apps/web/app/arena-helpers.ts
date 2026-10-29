import {
  DEFAULT_CATEGORIES,
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_VALUES,
  arenaQuestionsResponseSchema,
  type ArenaQuestion,
  type ArenaQuestionsResponse,
  type ArenaStatusCounts,
  type QuestionStatus,
} from "@forecasthub/shared";

export {
  DEFAULT_CATEGORIES,
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_VALUES,
  type ArenaQuestion,
  type ArenaQuestionsResponse,
  type ArenaStatusCounts,
  type QuestionStatus,
};

export const CATEGORY_ICONS: Record<string, string> = {
  Sports: "⚽",
  Economics: "📈",
  Financials: "💹",
  Crypto: "🪙",
  "Weather & Climate": "🌦️",
  Politics: "🏛️",
  "Culture & Entertainment": "🎬",
  "Tech & Science": "🔬",
  Companies: "🏢",
  "Campus Events": "🎓",
};

export const getCategoryIcon = (category: string): string => {
  return CATEGORY_ICONS[category] ?? "◈";
};

export const toggleStatusSelection = (
  current: readonly QuestionStatus[],
  status: QuestionStatus,
): QuestionStatus[] => {
  if (current.includes(status)) {
    const remaining = current.filter((item) => item !== status);
    return remaining.length > 0 ? remaining : ["OPEN"];
  }
  return [...current, status];
};

export const toggleCategorySelection = (
  current: readonly string[],
  category: string,
): string[] => {
  if (current.includes(category)) {
    return current.filter((item) => item !== category);
  }
  return [...current, category];
};

export const buildArenaQueryString = (params: {
  categories: readonly string[];
  statuses: readonly QuestionStatus[];
}): string => {
  const searchParams = new URLSearchParams();
  if (params.categories.length > 0) {
    searchParams.set("category", params.categories.join(","));
  }
  const statuses = params.statuses.length > 0 ? params.statuses : ["OPEN"];
  searchParams.set("status", statuses.join(","));
  return searchParams.toString();
};

export const formatBreadcrumbLabel = (statuses: readonly QuestionStatus[]): string => {
  if (statuses.length === 0) {
    return QUESTION_STATUS_LABELS.OPEN;
  }
  return statuses.map((status) => QUESTION_STATUS_LABELS[status]).join(", ");
};

export const getQuestionCrowdSummary = (question: ArenaQuestion): string => {
  if (question.status === "CANCELLED") {
    return "Cancelled. All credits were refunded.";
  }
  if (question.type === "AB") {
    const [first, second] = question.answers;
    if (question.status === "RESOLVED" && question.correctAnswerId) {
      const winner =
        first.id === question.correctAnswerId
          ? first.label
          : second.id === question.correctAnswerId
            ? second.label
            : first.label;
      return `Correct answer: ${winner}`;
    }
    const leader = first.price >= second.price ? first : second;
    return `The crowd thinks ${leader.label} is about ${leader.price}% likely.`;
  }

  if (question.status === "RESOLVED" && question.correctAnswerId) {
    const winner = question.answers.find((answer) => answer.id === question.correctAnswerId);
    if (winner) {
      return `Correct answer: ${winner.label}`;
    }
  }
  const hiddenCount = question.totalAnswerCount - question.topAnswers.length;
  if (hiddenCount > 0) {
    return `+${hiddenCount} more answer${hiddenCount > 1 ? "s" : ""}`;
  }
  return "";
};

export const isQuestionOpenForPredictions = (question: ArenaQuestion): boolean => {
  return question.status === "OPEN" || question.status === "CLOSING_SOON";
};

export const fetchArenaQuestions = async (params: {
  apiBaseUrl?: string;
  categories: readonly string[];
  statuses: readonly QuestionStatus[];
  fetchImpl?: typeof fetch;
}): Promise<ArenaQuestionsResponse> => {
  const baseUrl = (
    params.apiBaseUrl ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
  const queryString = buildArenaQueryString({
    categories: params.categories,
    statuses: params.statuses,
  });
  const fetcher = params.fetchImpl ?? fetch;
  const response = await fetcher(`${baseUrl}/api/v1/public/questions?${queryString}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Arena questions (HTTP ${response.status}).`);
  }

  const json: unknown = await response.json();
  return arenaQuestionsResponseSchema.parse(json);
};
