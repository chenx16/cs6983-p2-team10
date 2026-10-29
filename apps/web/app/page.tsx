"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  arenaQuestionsResponseSchema,
  type ArenaQuestion,
  type QuestionStatus,
  type StatusCounts,
} from "@forecasthub/shared";
import {
  ArenaView,
  STATUS_LABELS,
  buildQuestionsQueryString,
  formatPacificDeadline,
  toggleCategorySelection,
  toggleStatusSelection,
} from "./arena";

type View = "arena" | "leaderboard" | "profile" | "sign-in";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const EMPTY_COUNTS: StatusCounts = {
  OPEN: 0,
  CLOSING_SOON: 0,
  CLOSED: 0,
  RESOLVED: 0,
  CANCELLED: 0,
};

const leaderboard = [
  { rank: 1, username: "forecastfox", scored: 42, success: "78%" },
  { rank: 2, username: "northstar", scored: 39, success: "74%" },
  { rank: 3, username: "qiongwu", scored: 31, success: "71%" },
  { rank: 4, username: "signalhouse", scored: 28, success: "68%" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="icon">
      {children}
    </span>
  );
}

function Button({
  children,
  primary = false,
  onClick,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={`button ${primary ? "button-primary" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function AppShell({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("arena")} type="button">
          <span className="brand-mark">↗</span> ForecastHub
        </button>
        <nav aria-label="Primary navigation" className="nav-links">
          <button
            className={view === "arena" ? "active" : ""}
            onClick={() => onNavigate("arena")}
            type="button"
          >
            <Icon>⌂</Icon> Arena
          </button>
          <button
            className={view === "leaderboard" ? "active" : ""}
            onClick={() => onNavigate("leaderboard")}
            type="button"
          >
            <Icon>♜</Icon> Leaderboard
          </button>
          <a href={`${API_BASE_URL}/api/docs`}>
            <Icon>⌁</Icon> API docs
          </a>
        </nav>
        <div className="sidebar-bottom">
          <p>Credits are virtual and free.</p>
          <Button onClick={() => onNavigate("sign-in")}>Sign in</Button>
          <Button primary onClick={() => onNavigate("sign-in")}>
            Register
          </Button>
        </div>
      </aside>
      <div className="mobile-bar">
        <button className="brand" onClick={() => onNavigate("arena")} type="button">
          <span className="brand-mark">↗</span> ForecastHub
        </button>
        <button
          aria-label="Open navigation"
          className="mobile-menu"
          onClick={() => onNavigate("leaderboard")}
          type="button"
        >
          ☰
        </button>
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Detail({
  question,
  initialAnswerLabel,
  onBack,
  onSignIn,
}: {
  question: ArenaQuestion;
  initialAnswerLabel?: string | undefined;
  onBack: () => void;
  onSignIn: () => void;
}) {
  const [amount, setAmount] = useState("100");
  const [selected, setSelected] = useState(
    initialAnswerLabel ?? question.answers[0]?.label ?? "",
  );
  const [preview, setPreview] = useState(false);

  const deadlineText = formatPacificDeadline(question.deadline);
  const statusLabel = STATUS_LABELS[question.status];
  const isClosed =
    question.status === "CLOSED" ||
    question.status === "RESOLVED" ||
    question.status === "CANCELLED";

  return (
    <>
      <button className="back-link" onClick={onBack} type="button">
        ← Back to Arena
      </button>
      <div className="detail-heading">
        <p className="eyebrow">
          {question.category} · {statusLabel}
        </p>
        <h1>{question.title}</h1>
        <p className="muted tabular-nums">
          {deadlineText} · {question.totalCredits.toLocaleString("en-US")} credits
          in this question
        </p>
      </div>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="panel crowd-panel">
            <div className="panel-heading">
              <h2>What the crowd thinks</h2>
              <span className="live">
                <i /> Live
              </span>
            </div>
            {question.type === "AB" ? (
              <div className="big-answers">
                {question.answers.map((answer, index) => (
                  <div
                    className={`big-answer ${index === 0 ? "yes" : "no"}`}
                    key={answer.id}
                  >
                    <span>{answer.label}</span>
                    <strong className="tabular-nums">
                      {answer.price ?? 50}%
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pool-list large">
                {question.answers.map((answer) => {
                  const pct = answer.sharePct ?? 0;
                  return (
                    <div className="pool-option" key={answer.id}>
                      <span
                        className="pool-fill"
                        style={{ width: `${pct}%` }}
                      />
                      <span>{answer.label}</span>
                      <strong className="tabular-nums">{pct}%</strong>
                    </div>
                  );
                })}
              </div>
            )}
            <div
              aria-label="Forecast history chart"
              className="chart-placeholder"
              role="img"
            >
              <span className="chart-line" />
              <span className="chart-axis">
                7 days ago <b>Today</b>
              </span>
            </div>
          </div>
          <div className="panel">
            <h2>About this question</h2>
            <dl className="facts">
              <div>
                <dt>How it resolves</dt>
                <dd>{question.criteria}</dd>
              </div>
              <div>
                <dt>Trusted source</dt>
                <dd>{question.source}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{deadlineText} (Pacific Time)</dd>
              </div>
            </dl>
          </div>
        </section>
        <aside className="panel prediction-panel">
          <h2>Make a prediction</h2>
          <p className="balance">
            Sign in to see your balance. New accounts start with 1,000 free
            credits.
          </p>
          <fieldset>
            <legend>Choose an answer</legend>
            {question.answers.map((answer) => {
              const valueDisplay =
                question.type === "AB"
                  ? `${answer.price ?? 50}%`
                  : `${answer.sharePct ?? 0}%`;
              return (
                <label
                  className={`choice ${selected === answer.label ? "selected" : ""}`}
                  key={answer.id}
                >
                  <input
                    checked={selected === answer.label}
                    name="answer"
                    onChange={() => setSelected(answer.label)}
                    type="radio"
                  />{" "}
                  <span>{answer.label}</span>
                  <b className="tabular-nums">{valueDisplay}</b>
                </label>
              );
            })}
          </fieldset>
          <label className="field-label" htmlFor="amount">
            Credits to put on this answer
          </label>
          <div className="amount-input">
            <input
              id="amount"
              min="10"
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              value={amount}
            />
            <span>credits</span>
          </div>
          <div className="quick-amounts">
            {["25", "100", "250"].map((value) => (
              <button
                key={value}
                onClick={() => setAmount(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          {preview && (
            <div className="preview-box" role="status">
              <strong>Preview prepared</strong>
              <span>
                {amount} credits on {selected}. The server will confirm the
                final charge and outcome.
              </span>
            </div>
          )}
          {isClosed ? (
            <p className="closed">
              Predictions closed at {deadlineText}.
            </p>
          ) : (
            <Button
              primary
              onClick={() => {
                setPreview(true);
                onSignIn();
              }}
            >
              Sign in to predict
            </Button>
          )}
          <p className="fine-print">
            Predictions are timestamped and cannot be changed or withdrawn.
          </p>
        </aside>
      </div>
    </>
  );
}

function SignIn({ onBack }: { onBack: () => void }) {
  return (
    <div className="auth-view">
      <button className="brand auth-brand" onClick={onBack} type="button">
        <span className="brand-mark">↗</span> ForecastHub
      </button>
      <form className="auth-card" onSubmit={(event) => event.preventDefault()}>
        <h1>Sign in</h1>
        <p className="muted">
          Make predictions, track your credits, and climb the leaderboard.
        </p>
        <label className="field-label" htmlFor="email">
          Email address
        </label>
        <input className="text-input" id="email" type="email" />
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input className="text-input" id="password" type="password" />
        <Button primary type="submit">
          Sign in
        </Button>
        <p className="auth-foot">
          New to ForecastHub? <button type="button">Create an account</button>
        </p>
        <p className="prototype-warning">
          Use your own account. Prototype credentials are not used in
          production.
        </p>
      </form>
    </div>
  );
}

function Leaderboard() {
  return (
    <>
      <div className="breadcrumbs">
        ForecastHub <span>›</span> <b>Leaderboard</b>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">All time</p>
          <h1>Forecast well. Learn publicly.</h1>
        </div>
      </div>
      <div className="panel leaderboard-panel">
        <table>
          <caption className="sr-only">ForecastHub leaderboard</caption>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Scored questions</th>
              <th>Success rate</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.username}>
                <td className="tabular-nums">{row.rank}</td>
                <td>
                  <strong>{row.username}</strong>
                </td>
                <td className="tabular-nums">{row.scored}</td>
                <td className="tabular-nums">{row.success}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("arena");
  const [selectedStatuses, setSelectedStatuses] = useState<QuestionStatus[]>([
    "OPEN",
  ]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([
    ...DEFAULT_CATEGORIES,
  ]);
  const [countsByStatus, setCountsByStatus] =
    useState<StatusCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [selectedQuestion, setSelectedQuestion] =
    useState<ArenaQuestion | null>(null);
  const [preselectedAnswer, setPreselectedAnswer] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const queryString = buildQuestionsQueryString({
      categories: selectedCategories,
      statuses: selectedStatuses,
    });

    setIsLoading(true);
    setErrorMessage(null);

    fetch(`${API_BASE_URL}/api/v1/public/questions?${queryString}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const msg =
            body?.error?.message ??
            `Request failed with status ${response.status}.`;
          throw new Error(msg);
        }
        return response.json();
      })
      .then((raw) => {
        const parsed = arenaQuestionsResponseSchema.parse(raw);
        setQuestions(parsed.questions);
        if (parsed.categories.length > 0) {
          setCategories(parsed.categories);
        }
        setCountsByStatus(parsed.countsByStatus);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load prediction questions from the server.",
        );
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedCategories, selectedStatuses, retryNonce]);

  const openQuestion = useCallback(
    (question: ArenaQuestion, answerLabel?: string) => {
      setSelectedQuestion(question);
      setPreselectedAnswer(answerLabel);
      setView("arena");
    },
    [],
  );

  const handleToggleStatus = useCallback((status: QuestionStatus) => {
    setSelectedStatuses((prev) => toggleStatusSelection(prev, status));
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => toggleCategorySelection(prev, category));
  }, []);

  const handleClearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedStatuses(["OPEN"]);
    setSelectedCategories([]);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  const content = useMemo(() => {
    if (view === "sign-in") {
      return <SignIn onBack={() => setView("arena")} />;
    }
    if (view === "leaderboard") {
      return <Leaderboard />;
    }
    if (selectedQuestion) {
      return (
        <Detail
          initialAnswerLabel={preselectedAnswer}
          onBack={() => {
            setSelectedQuestion(null);
            setPreselectedAnswer(undefined);
          }}
          onSignIn={() => setView("sign-in")}
          question={selectedQuestion}
        />
      );
    }
    return (
      <ArenaView
        categories={categories}
        countsByStatus={countsByStatus}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onClearCategories={handleClearCategories}
        onOpenQuestion={openQuestion}
        onResetFilters={handleResetFilters}
        onRetry={handleRetry}
        onToggleCategory={handleToggleCategory}
        onToggleStatus={handleToggleStatus}
        questions={questions}
        selectedCategories={selectedCategories}
        selectedStatuses={selectedStatuses}
      />
    );
  }, [
    categories,
    countsByStatus,
    errorMessage,
    handleClearCategories,
    handleResetFilters,
    handleRetry,
    handleToggleCategory,
    handleToggleStatus,
    isLoading,
    openQuestion,
    preselectedAnswer,
    questions,
    selectedCategories,
    selectedQuestion,
    selectedStatuses,
    view,
  ]);

  if (view === "sign-in") {
    return content;
  }

  return (
    <AppShell
      onNavigate={(next) => {
        setSelectedQuestion(null);
        setPreselectedAnswer(undefined);
        setView(next);
      }}
      view={view}
    >
      {content}
    </AppShell>
  );
}
