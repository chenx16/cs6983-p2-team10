import React from "react";
import {
  DEFAULT_CATEGORIES,
  QUESTION_STATUSES,
  type ArenaQuestion,
  type QuestionStatus,
  type StatusCounts,
} from "@forecasthub/shared";

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  OPEN: "Open",
  CLOSING_SOON: "Closing soon",
  CLOSED: "Closed",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
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

const PACIFIC_TZ = "America/Los_Angeles";
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const ptDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  month: "short",
  day: "numeric",
});

const ptTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  hour: "numeric",
  minute: "2-digit",
});

const ptYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  year: "numeric",
});

const ptFullFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatPacificDeadline(deadlineIso: string): string {
  const date = new Date(deadlineIso);
  return `${ptFullFormatter.format(date)} PT`;
}

export function formatCardDeadline(
  deadlineIso: string,
  now: Date = new Date(),
): { text: string; fullPt: string; isSoon: boolean } {
  const deadline = new Date(deadlineIso);
  const diffMs = deadline.getTime() - now.getTime();
  const fullPt = formatPacificDeadline(deadlineIso);

  if (diffMs > 0 && diffMs <= DAY_MS) {
    const totalMinutes = Math.max(1, Math.round(diffMs / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const countdown =
      totalMinutes < 60
        ? `Closes in ${totalMinutes} min`
        : `Closes in ${hours} h${minutes ? ` ${minutes} min` : ""}`;
    return {
      text: `${countdown} (${ptTimeFormatter.format(deadline)} PT)`,
      fullPt,
      isSoon: true,
    };
  }

  const sameYear =
    ptYearFormatter.format(deadline) === ptYearFormatter.format(now);
  const yearSuffix = sameYear ? "" : `, ${ptYearFormatter.format(deadline)}`;
  const prefix = diffMs > 0 ? "Closes " : "Closed ";
  return {
    text: `${prefix}${ptDateFormatter.format(deadline)}${yearSuffix}, ${ptTimeFormatter.format(deadline)} PT`,
    fullPt,
    isSoon: false,
  };
}

export function toggleStatusSelection(
  current: readonly QuestionStatus[],
  target: QuestionStatus,
): QuestionStatus[] {
  if (current.includes(target)) {
    return current.filter((status) => status !== target);
  }
  return [...current, target];
}

export function toggleCategorySelection(
  current: readonly string[],
  target: string,
): string[] {
  if (current.includes(target)) {
    return current.filter((category) => category !== target);
  }
  return [...current, target];
}

export function buildQuestionsQueryString(params: {
  categories: readonly string[];
  statuses: readonly QuestionStatus[];
}): string {
  const searchParams = new URLSearchParams();
  for (const category of params.categories) {
    searchParams.append("category", category);
  }
  if (params.statuses.length === 0) {
    searchParams.append("status", "ALL");
  } else {
    for (const status of params.statuses) {
      searchParams.append("status", status);
    }
  }
  return searchParams.toString();
}

export function QuestionCard({
  question,
  now,
  onOpenQuestion,
}: {
  question: ArenaQuestion;
  now?: Date | undefined;
  onOpenQuestion: (
    question: ArenaQuestion,
    preselectedAnswerLabel?: string | undefined,
  ) => void;
}) {
  const isOpen =
    question.status === "OPEN" || question.status === "CLOSING_SOON";
  const deadlineInfo = formatCardDeadline(question.deadline, now);
  const categoryIcon = CATEGORY_ICONS[question.category] ?? "◈";
  const statusLabel = STATUS_LABELS[question.status];

  const firstAnswer = question.answers[0];
  const secondAnswer = question.answers[1];
  const priceA = firstAnswer?.price ?? 50;
  const priceB = secondAnswer?.price ?? 50;
  const leader =
    priceA >= priceB
      ? { label: firstAnswer?.label ?? "Yes", price: priceA }
      : { label: secondAnswer?.label ?? "No", price: priceB };

  const remainingAnswerCount = Math.max(
    0,
    question.totalAnswerCount - question.answers.length,
  );

  return (
    <article
      className={`question-card ${isOpen ? "" : "question-card-past"}`}
      data-testid={`question-card-${question.id}`}
    >
      <div className="card-meta">
        <span>
          <span aria-hidden="true" className="category-icon">
            {categoryIcon}
          </span>{" "}
          {question.category}
        </span>
        {question.isHot && isOpen && (
          <span
            className="hot"
            title="One of the most active questions in the last 24 hours"
          >
            🔥 Hot
          </span>
        )}
        {question.status === "CLOSING_SOON" && (
          <span className="hot">● Closing soon</span>
        )}
        {!isOpen && <span className="tag">{statusLabel}</span>}
      </div>

      <h2 className="question-heading">
        <button
          className="question-title"
          onClick={() => onOpenQuestion(question)}
          type="button"
        >
          {question.title}
        </button>
      </h2>

      {question.type === "AB" ? (
        <>
          <div className="answer-grid">
            {question.answers.map((answer, index) => {
              const colorClass = index === 0 ? "yes" : "no";
              const lostClass =
                question.status === "RESOLVED" && answer.isCorrect === false
                  ? "answer-lost"
                  : "";
              const price = answer.price ?? 50;
              return (
                <button
                  aria-label={`${answer.label}, price ${price}${isOpen ? ". Predict" : ""}`}
                  className={`answer ${colorClass} ${lostClass}`.trim()}
                  disabled={!isOpen}
                  key={answer.id}
                  onClick={() => onOpenQuestion(question, answer.label)}
                  type="button"
                >
                  <span className="answer-label">{answer.label}</span>
                  <strong className="tabular-nums">{price}</strong>
                </button>
              );
            })}
          </div>
          <div aria-hidden="true" className="split-bar">
            <span style={{ width: `${priceA}%` }} />
          </div>
          <p className="crowd-summary">
            {question.status === "RESOLVED"
              ? `Correct answer: ${question.correctAnswerLabel ?? firstAnswer?.label ?? ""}`
              : question.status === "CANCELLED"
                ? "Cancelled. All credits were refunded."
                : `The crowd thinks ${leader.label} is about ${leader.price}% likely.`}
          </p>
        </>
      ) : (
        <>
          <div className="pool-list">
            {question.answers.map((answer) => {
              const sharePct = answer.sharePct ?? 0;
              const hasCredits = (answer.credits ?? 0) > 0;
              const winClass =
                question.status === "RESOLVED" && answer.isCorrect
                  ? "pool-option-win"
                  : "";
              return (
                <button
                  aria-label={`${answer.label}, ${sharePct}% of the pool${isOpen ? ". Predict" : ""}`}
                  className={`pool-option ${winClass}`.trim()}
                  disabled={!isOpen}
                  key={answer.id}
                  onClick={() => onOpenQuestion(question, answer.label)}
                  type="button"
                >
                  <span
                    className="pool-fill"
                    style={{ width: `${sharePct}%` }}
                  />
                  <span>{answer.label}</span>
                  <strong className="tabular-nums">
                    {hasCredits ? `${sharePct}%` : "No predictions yet"}
                  </strong>
                </button>
              );
            })}
          </div>
          {question.status === "RESOLVED" ? (
            <p className="crowd-summary">
              Correct answer: {question.correctAnswerLabel ?? ""}
            </p>
          ) : question.status === "CANCELLED" ? (
            <p className="crowd-summary">
              Cancelled. All credits were refunded.
            </p>
          ) : remainingAnswerCount > 0 ? (
            <p className="crowd-summary">
              +{remainingAnswerCount} more answer
              {remainingAnswerCount > 1 ? "s" : ""}
            </p>
          ) : null}
        </>
      )}

      <div className="card-footer">
        <span className="tabular-nums">
          <strong>{question.totalCredits.toLocaleString("en-US")}</strong>{" "}
          credits
        </span>
        <span
          className={`tabular-nums ${deadlineInfo.isSoon ? "deadline-soon" : ""}`.trim()}
          title={deadlineInfo.fullPt}
        >
          {deadlineInfo.text}
        </span>
      </div>
    </article>
  );
}

export function ArenaView({
  questions,
  categories = DEFAULT_CATEGORIES,
  countsByStatus,
  selectedStatuses,
  selectedCategories,
  isLoading,
  errorMessage,
  now,
  onToggleStatus,
  onToggleCategory,
  onClearCategories,
  onResetFilters,
  onRetry,
  onOpenQuestion,
}: {
  questions: readonly ArenaQuestion[];
  categories?: readonly string[] | undefined;
  countsByStatus: StatusCounts;
  selectedStatuses: readonly QuestionStatus[];
  selectedCategories: readonly string[];
  isLoading: boolean;
  errorMessage: string | null;
  now?: Date | undefined;
  onToggleStatus: (status: QuestionStatus) => void;
  onToggleCategory: (category: string) => void;
  onClearCategories: () => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onOpenQuestion: (
    question: ArenaQuestion,
    preselectedAnswerLabel?: string | undefined,
  ) => void;
}) {
  const breadcrumbLabel =
    selectedStatuses.length > 0
      ? selectedStatuses.map((status) => STATUS_LABELS[status]).join(", ")
      : "All statuses";

  return (
    <>
      <div className="breadcrumbs">
        ForecastHub <span aria-hidden="true">›</span> <b>{breadcrumbLabel}</b>
      </div>

      <div className="page-heading">
        <div>
          <p className="eyebrow">The Arena</p>
          <h1>Questions worth thinking about.</h1>
        </div>
        <div
          aria-label="Question status"
          className="status-filters"
          role="group"
        >
          {QUESTION_STATUSES.map((status) => {
            const isSelected = selectedStatuses.includes(status);
            return (
              <button
                aria-pressed={isSelected}
                key={status}
                onClick={() => onToggleStatus(status)}
                type="button"
              >
                <span>{STATUS_LABELS[status]}</span>
                <span className="status-count tabular-nums">
                  {countsByStatus[status]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div aria-label="Question categories" className="topic-tabs" role="group">
        <button
          aria-pressed={selectedCategories.length === 0}
          onClick={onClearCategories}
          type="button"
        >
          All
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={selectedCategories.includes(category)}
            key={category}
            onClick={() => onToggleCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {isLoading
          ? "Loading questions…"
          : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
      </p>

      {errorMessage ? (
        <div className="error-state" role="alert">
          <strong>Unable to load questions</strong>
          <span>{errorMessage}</span>
          <div>
            <button className="button" onClick={onRetry} type="button">
              Try again
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="empty-state" role="status">
          <strong>Loading questions…</strong>
          <span>Fetching the latest market prices and pools.</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <strong>No questions match these filters</strong>
          <span>Try another status or category.</span>
          <div style={{ marginTop: "14px" }}>
            <button className="button" onClick={onResetFilters} type="button">
              Reset filters
            </button>
          </div>
        </div>
      ) : (
        <div className="question-grid">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              now={now}
              onOpenQuestion={onOpenQuestion}
              question={question}
            />
          ))}
        </div>
      )}

      <p className="privacy-note">
        All times are Pacific Time. Credits are virtual only and cannot be
        bought, sold, or exchanged for money.
      </p>
    </>
  );
}
