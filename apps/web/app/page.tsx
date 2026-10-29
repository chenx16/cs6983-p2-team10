"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_VALUES,
  fetchArenaQuestions,
  formatBreadcrumbLabel,
  getCategoryIcon,
  getQuestionCrowdSummary,
  isQuestionOpenForPredictions,
  toggleCategorySelection,
  toggleStatusSelection,
  type ArenaQuestion,
  type ArenaStatusCounts,
  type QuestionStatus,
} from "./arena-helpers";

type View = "arena" | "leaderboard" | "sign-in";

const leaderboard = [
  { rank: 1, username: "forecastfox", scored: 42, success: "78%" },
  { rank: 2, username: "northstar", scored: 39, success: "74%" },
  { rank: 3, username: "qiongwu", scored: 31, success: "71%" },
  { rank: 4, username: "signalhouse", scored: 28, success: "68%" },
];

const INITIAL_STATUS_COUNTS: ArenaStatusCounts = {
  OPEN: 0,
  CLOSING_SOON: 0,
  CLOSED: 0,
  RESOLVED: 0,
  CANCELLED: 0,
};

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

function QuestionCard({
  question,
  onOpen,
  onSelectAnswer,
}: {
  question: ArenaQuestion;
  onOpen: () => void;
  onSelectAnswer: (answerLabel: string) => void;
}) {
  const isOpen = isQuestionOpenForPredictions(question);
  const crowdLine = getQuestionCrowdSummary(question);
  const statusLabel = QUESTION_STATUS_LABELS[question.status];

  return (
    <article className={`question-card ${!isOpen ? "question-card-past" : ""}`}>
      <div className="card-meta">
        <span className="category-pill">
          <span aria-hidden="true" className="category-ico">
            {getCategoryIcon(question.category)}
          </span>
          <span>{question.category}</span>
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
          <span className="soon-badge">● Closing soon</span>
        )}
        {!isOpen && <span className="tag">{statusLabel}</span>}
      </div>

      <h2 className="question-heading">
        <button className="question-title" onClick={onOpen} type="button">
          {question.title}
        </button>
      </h2>

      {question.type === "AB" ? (
        <>
          <div className="answer-grid">
            {question.answers.map((answer, index) => {
              const colorClass = index === 0 ? "yes" : "no";
              const isLost =
                question.status === "RESOLVED" &&
                question.correctAnswerId !== null &&
                question.correctAnswerId !== answer.id;
              return (
                <button
                  aria-label={`${answer.label}, price ${answer.price}${isOpen ? ". Predict" : ""}`}
                  className={`answer ${colorClass} ${isLost ? "answer-lost" : ""}`}
                  disabled={!isOpen}
                  key={answer.id}
                  onClick={() => onSelectAnswer(answer.label)}
                  type="button"
                >
                  <span className="answer-label">{answer.label}</span>
                  <strong className="tabular-nums">{answer.price}</strong>
                </button>
              );
            })}
          </div>
          <div aria-hidden="true" className="split-bar">
            <span style={{ width: `${question.answers[0].price}%` }} />
          </div>
          {crowdLine && <p className="crowd-line">{crowdLine}</p>}
        </>
      ) : (
        <>
          <div className="pool-list">
            {question.topAnswers.map((answer) => {
              const isWinner =
                question.status === "RESOLVED" &&
                question.correctAnswerId === answer.id;
              return (
                <button
                  aria-label={`${answer.label}, ${answer.sharePercent}% of the pool${isOpen ? ". Predict" : ""}`}
                  className={`pool-option ${isWinner ? "pool-option-win" : ""}`}
                  disabled={!isOpen}
                  key={answer.id}
                  onClick={() => onSelectAnswer(answer.label)}
                  type="button"
                >
                  <span
                    className="pool-fill"
                    style={{ width: `${answer.sharePercent}%` }}
                  />
                  <span>{answer.label}</span>
                  <strong className="tabular-nums">
                    {answer.credits > 0 ? `${answer.sharePercent}%` : "No predictions yet"}
                  </strong>
                </button>
              );
            })}
          </div>
          {crowdLine && <p className="crowd-line">{crowdLine}</p>}
        </>
      )}

      <div className="card-footer">
        <span className="tabular-nums">
          <strong>{question.totalCredits.toLocaleString("en-US")}</strong> credits
        </span>
        <span
          className={`tabular-nums ${question.status === "CLOSING_SOON" ? "deadline-soon" : ""}`}
        >
          {question.closingLabelPt}
        </span>
      </div>
    </article>
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
      <aside aria-label="Sidebar" className="sidebar">
        <button className="brand" onClick={() => onNavigate("arena")} type="button">
          <span aria-hidden="true" className="brand-mark">
            ↗
          </span>{" "}
          ForecastHub
        </button>
        <nav aria-label="Primary navigation" className="nav-links">
          <button
            aria-current={view === "arena" ? "page" : undefined}
            className={view === "arena" ? "active" : ""}
            onClick={() => onNavigate("arena")}
            type="button"
          >
            <Icon>⌂</Icon> Arena
          </button>
          <button
            aria-current={view === "leaderboard" ? "page" : undefined}
            className={view === "leaderboard" ? "active" : ""}
            onClick={() => onNavigate("leaderboard")}
            type="button"
          >
            <Icon>♜</Icon> Leaderboard
          </button>
          <a href="/api/docs">
            <Icon>⌁</Icon> API docs
          </a>
        </nav>
        <div className="sidebar-bottom">
          <p>Sign in to make predictions. New accounts start with 1,000 free credits.</p>
          <Button primary onClick={() => onNavigate("sign-in")}>
            Register
          </Button>
          <Button onClick={() => onNavigate("sign-in")}>Sign in</Button>
        </div>
      </aside>
      <div className="mobile-bar">
        <button className="brand" onClick={() => onNavigate("arena")} type="button">
          <span aria-hidden="true" className="brand-mark">
            ↗
          </span>{" "}
          ForecastHub
        </button>
        <div className="mobile-actions">
          <Button onClick={() => onNavigate("sign-in")}>Sign in</Button>
          <Button primary onClick={() => onNavigate("sign-in")}>
            Register
          </Button>
        </div>
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Arena({
  onOpenQuestion,
}: {
  onOpenQuestion: (question: ArenaQuestion, preselectedAnswer?: string) => void;
}) {
  const [selectedStatuses, setSelectedStatuses] = useState<QuestionStatus[]>(["OPEN"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [statusCounts, setStatusCounts] =
    useState<ArenaStatusCounts>(INITIAL_STATUS_COUNTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchArenaQuestions({
        categories: selectedCategories,
        statuses: selectedStatuses,
      });
      setQuestions(response.questions);
      if (response.categories.length > 0) {
        setCategories(response.categories);
      }
      setStatusCounts(response.statusCounts);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load questions from the server.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategories, selectedStatuses]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const handleToggleStatus = (status: QuestionStatus) => {
    setSelectedStatuses((prev) => toggleStatusSelection(prev, status));
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) => toggleCategorySelection(prev, category));
  };

  const handleResetFilters = () => {
    setSelectedStatuses(["OPEN"]);
    setSelectedCategories([]);
  };

  const breadcrumbText = formatBreadcrumbLabel(selectedStatuses);

  return (
    <>
      <div className="breadcrumbs">
        Arena <span aria-hidden="true">›</span> <b>{breadcrumbText}</b>
      </div>

      <div className="page-heading">
        <div>
          <p className="eyebrow">The Arena</p>
          <h1>Questions worth thinking about.</h1>
        </div>
        <div aria-label="Question status" className="status-filters" role="group">
          {QUESTION_STATUS_VALUES.map((statusKey) => {
            const isSelected = selectedStatuses.includes(statusKey);
            return (
              <button
                aria-pressed={isSelected}
                key={statusKey}
                onClick={() => handleToggleStatus(statusKey)}
                type="button"
              >
                <span>{QUESTION_STATUS_LABELS[statusKey]}</span>
                <span className="status-count tabular-nums">
                  {statusCounts[statusKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div aria-label="Question categories" className="topic-tabs" role="group">
        <button
          aria-pressed={selectedCategories.length === 0}
          onClick={() => setSelectedCategories([])}
          type="button"
        >
          All
        </button>
        {categories.map((category) => (
          <button
            aria-pressed={selectedCategories.includes(category)}
            key={category}
            onClick={() => handleToggleCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {isLoading
          ? "Loading prediction questions…"
          : `${questions.length} question${questions.length === 1 ? "" : "s"} shown`}
      </p>

      {errorMessage ? (
        <div className="error-state" role="alert">
          <strong>Could not load Arena questions</strong>
          <span>{errorMessage}</span>
          <div className="state-actions">
            <Button onClick={() => void loadQuestions()}>Try again</Button>
          </div>
        </div>
      ) : isLoading ? (
        <div aria-busy="true" className="question-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="question-card skeleton-card" key={item}>
              <div className="skeleton-line skeleton-meta" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-body" />
              <div className="skeleton-line skeleton-footer" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <strong>No questions match these filters</strong>
          <span>Try another status or category.</span>
          <div className="state-actions">
            <Button onClick={handleResetFilters}>Reset filters</Button>
          </div>
        </div>
      ) : (
        <div className="question-grid">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              onOpen={() => onOpenQuestion(question)}
              onSelectAnswer={(answerLabel) =>
                onOpenQuestion(question, answerLabel)
              }
              question={question}
            />
          ))}
        </div>
      )}

      <p className="privacy-note">
        Credits are virtual and free. They cannot be bought, sold, or exchanged for
        money. All times are Pacific Time.
      </p>
    </>
  );
}

function Detail({
  question,
  initialAnswer,
  onBack,
  onSignIn,
}: {
  question: ArenaQuestion;
  initialAnswer?: string | undefined;
  onBack: () => void;
  onSignIn: () => void;
}) {
  const defaultAnswer =
    initialAnswer ??
    (question.type === "AB"
      ? question.answers[0].label
      : (question.answers[0]?.label ?? ""));
  const [amount, setAmount] = useState("100");
  const [selected, setSelected] = useState(defaultAnswer);
  const [preview, setPreview] = useState(false);

  const isOpen = isQuestionOpenForPredictions(question);
  const statusLabel = QUESTION_STATUS_LABELS[question.status];
  const answerChoices =
    question.type === "AB"
      ? question.answers.map((answer, idx) => ({
          id: answer.id,
          label: answer.label,
          displayValue: `${answer.price}%`,
          color: idx === 0 ? ("yes" as const) : ("no" as const),
          percent: answer.price,
        }))
      : question.answers.map((answer) => ({
          id: answer.id,
          label: answer.label,
          displayValue: `${answer.sharePercent}%`,
          color: undefined,
          percent: answer.sharePercent,
        }));

  return (
    <>
      <button className="back-link" onClick={onBack} type="button">
        ← Back to the Arena
      </button>
      <div className="detail-heading">
        <p className="eyebrow">
          {question.category} · {statusLabel}
        </p>
        <h1>{question.title}</h1>
        <p className="muted tabular-nums">
          {question.closingLabelPt} · {question.totalCredits.toLocaleString("en-US")}{" "}
          credits in this question
        </p>
      </div>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="panel crowd-panel">
            <div className="panel-heading">
              <h2>Crowd prediction</h2>
              {isOpen && (
                <span className="live">
                  <i /> Live
                </span>
              )}
            </div>
            {question.type === "AB" ? (
              <div className="big-answers">
                {answerChoices.map((answer) => (
                  <div
                    className={`big-answer ${answer.color ?? ""}`}
                    key={answer.id}
                  >
                    <span>{answer.label}</span>
                    <strong className="tabular-nums">{answer.percent}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pool-list large">
                {answerChoices.map((answer) => (
                  <div className="pool-option" key={answer.id}>
                    <span
                      className="pool-fill"
                      style={{ width: `${answer.percent}%` }}
                    />
                    <span>{answer.label}</span>
                    <strong className="tabular-nums">{answer.displayValue}</strong>
                  </div>
                ))}
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
                <dd>{question.deadlinePt}</dd>
              </div>
            </dl>
          </div>
        </section>
        <aside className="panel prediction-panel">
          <h2>Make a prediction</h2>
          <p className="balance">
            Sign in to see your balance. New accounts start with 1,000 free credits.
          </p>
          <fieldset>
            <legend>Choose an answer</legend>
            {answerChoices.map((answer) => (
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
                <b className="tabular-nums">{answer.displayValue}</b>
              </label>
            ))}
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
            {["10", "50", "100", "250"].map((value) => (
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
                {amount} credits on {selected}. The server will confirm the final
                charge and outcome.
              </span>
            </div>
          )}
          {!isOpen ? (
            <p className="closed">
              Predictions closed at {question.deadlinePt}.
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
        <span aria-hidden="true" className="brand-mark">
          ↗
        </span>{" "}
        ForecastHub
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
          Use your own account. Prototype credentials are not used in production.
        </p>
      </form>
      <button className="back-link" onClick={onBack} type="button">
        Back to the Arena
      </button>
    </div>
  );
}

function Leaderboard() {
  return (
    <>
      <div className="breadcrumbs">
        ForecastHub <span aria-hidden="true">›</span> <b>Leaderboard</b>
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
  const [selectedQuestion, setSelectedQuestion] = useState<{
    question: ArenaQuestion;
    preselectedAnswer?: string | undefined;
  } | null>(null);

  const openQuestion = useCallback(
    (question: ArenaQuestion, preselectedAnswer?: string) => {
      setSelectedQuestion({ question, preselectedAnswer });
      setView("arena");
    },
    [],
  );

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
          initialAnswer={selectedQuestion.preselectedAnswer}
          onBack={() => setSelectedQuestion(null)}
          onSignIn={() => setView("sign-in")}
          question={selectedQuestion.question}
        />
      );
    }
    return <Arena onOpenQuestion={openQuestion} />;
  }, [openQuestion, selectedQuestion, view]);

  if (view === "sign-in") {
    return content;
  }

  return (
    <AppShell
      onNavigate={(next) => {
        setSelectedQuestion(null);
        setView(next);
      }}
      view={view}
    >
      {content}
    </AppShell>
  );
}
