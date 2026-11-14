"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthPage } from "./auth-page";
import { getCurrentUser, logout } from "./auth-client";
import type { AuthUser } from "./auth-client";
import { AppShell, type AuthMode, type View } from "./app-shell";
import { AdminPage } from "./admin-page";
import { OrganizerPage } from "./organizer-page";
import { arenaQuestionsResponseSchema, predictionHistoryResponseSchema, type PredictionHistoryResponse } from "@forecasthub/shared";

type QuestionType = "A/B" | "Multi";
type Status = "Open";

type Question = {
  id: string;
  title: string;
  category: string;
  deadline: string;
  status: Status;
  type: QuestionType;
  total: number;
  answers: { label: string; value: number; color?: "yes" | "no" }[];
  source: string;
  criteria: string;
};

const leaderboard = [
  { rank: 1, username: "forecastfox", scored: 42, success: "78%" },
  { rank: 2, username: "northstar", scored: 39, success: "74%" },
  { rank: 3, username: "qiongwu", scored: 31, success: "71%" },
  { rank: 4, username: "signalhouse", scored: 28, success: "68%" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
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
    <button className={`button ${primary ? "button-primary" : ""}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function QuestionCard({ question, onOpen }: { question: Question; onOpen: () => void }) {
  const firstAnswer = question.answers[0];
  return (
    <article className="question-card">
      <div className="card-meta">
        <span><Icon>◈</Icon> {question.category}</span>
        <span className="tag">{question.status}</span>
      </div>
      <button className="question-title" onClick={onOpen}>{question.title}</button>
      {question.type === "A/B" ? (
        <>
          <div className="answer-grid">
            {question.answers.map((answer) => (
              <button className={`answer ${answer.color}`} key={answer.label} onClick={onOpen}>
                <span>{answer.label}</span><strong>{answer.value}</strong>
              </button>
            ))}
          </div>
          <div className="split-bar"><span style={{ width: `${firstAnswer?.value ?? 0}%` }} /></div>
        </>
      ) : (
        <div className="pool-list">
          {question.answers.map((answer) => (
            <button className="pool-option" key={answer.label} onClick={onOpen}>
              <span className="pool-fill" style={{ width: `${answer.value}%` }} />
              <span>{answer.label}</span><strong>{answer.value}%</strong>
            </button>
          ))}
        </div>
      )}
      <div className="card-footer">
        <span>{question.deadline}</span><strong>{question.total.toLocaleString()} credits</strong>
      </div>
    </article>
  );
}

function Arena({ onOpen }: { onOpen: (question: Question) => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All topics");
  useEffect(() => {
    let active = true;
    void fetch("/api/v1/public/questions", { credentials: "include" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Unable to load Arena questions.");
        return arenaQuestionsResponseSchema.parse(payload);
      })
      .then((payload) => {
        if (!active) return;
        setQuestions(payload.questions.map((question) => ({
          id: question.id,
          title: question.title,
          category: question.category,
          deadline: new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }).format(new Date(question.deadline)) + " PT",
          status: "Open",
          type: "A/B",
          total: question.totalCreditsSpent,
          answers: question.answers.map((answer, index) => ({ label: answer.text, value: answer.price, color: index === 0 ? "yes" : "no" })),
          source: question.source,
          criteria: question.outcomeCriteria,
        })));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load Arena questions.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const categories = ["All topics", ...new Set(questions.map((question) => question.category))];
  const filtered = questions.filter((question) => category === "All topics" || question.category === category);

  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>Open</b></div>
      <div className="page-heading">
        <div><p className="eyebrow">The Arena</p><h1>Questions worth thinking about.</h1><p className="muted">Published questions still open for predictions.</p></div>
      </div>
      <div className="topic-tabs" aria-label="Question topics">
        {categories.map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)}>{value}</button>)}
      </div>
      {loading && <p role="status">Loading published questions…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && <div className="question-grid">
        {filtered.map((question) => <QuestionCard key={question.id} onOpen={() => onOpen(question)} question={question} />)}
      </div>}
      {!loading && !error && filtered.length === 0 && <div className="empty-state"><strong>No open questions here yet.</strong><span>Published questions appear after their deadline is set in the future.</span></div>}
      <p className="privacy-note">All times are Pacific Time. Credits are virtual only and cannot be bought, sold, or exchanged for money.</p>
    </>
  );
}

function Detail({ question, onBack, onSignIn }: { question: Question; onBack: () => void; onSignIn: () => void }) {
  const [amount, setAmount] = useState("100");
  const [selected, setSelected] = useState(question.answers[0]?.label ?? "");
  const [preview, setPreview] = useState(false);
  return (
    <>
      <button className="back-link" onClick={onBack}>← Back to Arena</button>
      <div className="detail-heading"><p className="eyebrow">{question.category} · {question.status}</p><h1>{question.title}</h1><p className="muted">{question.deadline} · {question.total.toLocaleString()} credits in this question</p></div>
      <div className="detail-grid">
        <section className="detail-main">
          <div className="panel crowd-panel"><div className="panel-heading"><h2>What the crowd thinks</h2><span className="live"><i /> Live</span></div>
            {question.type === "A/B" ? <div className="big-answers">{question.answers.map((answer) => <div className={`big-answer ${answer.color}`} key={answer.label}><span>{answer.label}</span><strong>{answer.value}%</strong></div>)}</div> : <div className="pool-list large">{question.answers.map((answer) => <div className="pool-option" key={answer.label}><span className="pool-fill" style={{ width: `${answer.value}%` }} /><span>{answer.label}</span><strong>{answer.value}%</strong></div>)}</div>}
            <div className="chart-placeholder" role="img" aria-label="Forecast history chart"><span className="chart-line" /><span className="chart-axis">7 days ago <b>Today</b></span></div>
          </div>
          <div className="panel"><h2>About this question</h2><dl className="facts"><div><dt>How it resolves</dt><dd>{question.criteria}</dd></div><div><dt>Trusted source</dt><dd>{question.source}</dd></div><div><dt>Deadline</dt><dd>{question.deadline} (Pacific Time)</dd></div></dl></div>
        </section>
        <aside className="panel prediction-panel">
          <h2>Make a prediction</h2>
          <p className="balance">Sign in to see your balance. New accounts start with 1,000 free credits.</p>
          <fieldset><legend>Choose an answer</legend>{question.answers.map((answer) => <label className={`choice ${selected === answer.label ? "selected" : ""}`} key={answer.label}><input checked={selected === answer.label} name="answer" onChange={() => setSelected(answer.label)} type="radio" /> <span>{answer.label}</span><b>{answer.value}%</b></label>)}</fieldset>
          <label className="field-label" htmlFor="amount">Credits to put on this answer</label>
          <div className="amount-input"><input id="amount" min="1" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} /><span>credits</span></div>
          <div className="quick-amounts">{["25", "100", "250"].map((value) => <button key={value} onClick={() => setAmount(value)}>{value}</button>)}</div>
          {preview && <div className="preview-box" role="status"><strong>Preview prepared</strong><span>{amount} credits on {selected}. The server will confirm the final charge and outcome.</span></div>}
          <Button primary onClick={() => { setPreview(true); onSignIn(); }}>Sign in to predict</Button>
          <p className="fine-print">Predictions are timestamped and cannot be changed or withdrawn.</p>
        </aside>
      </div>
    </>
  );
}

function SignIn({ mode, onBack }: { mode: AuthMode; onBack: () => void | Promise<void> }) {
  return <AuthPage initialMode={mode} onAuthenticated={onBack} />;
}

function Leaderboard() {
  return <><div className="breadcrumbs">ForecastHub <span>›</span> <b>Leaderboard</b></div><div className="page-heading"><div><p className="eyebrow">All time</p><h1>Forecast well. Learn publicly.</h1></div></div><div className="panel leaderboard-panel"><table><caption className="sr-only">ForecastHub leaderboard</caption><thead><tr><th>Rank</th><th>Username</th><th>Scored questions</th><th>Success rate</th></tr></thead><tbody>{leaderboard.map((row) => <tr key={row.username}><td>{row.rank}</td><td><strong>{row.username}</strong></td><td>{row.scored}</td><td>{row.success}</td></tr>)}</tbody></table></div></>;
}

function PredictionHistory() {
  const [history, setHistory] = useState<PredictionHistoryResponse["predictions"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/v1/private/predictions", { credentials: "include" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Unable to load your prediction history.");
        return predictionHistoryResponseSchema.parse(payload);
      })
      .then((payload) => setHistory(payload.predictions))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load your prediction history."))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>My predictions</b></div>
      <div className="page-heading"><div><p className="eyebrow">Private history</p><h1>Your predictions</h1><p className="muted">Review your choices and settled outcomes.</p></div></div>
      {loading && <p role="status">Loading prediction history…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && history.length === 0 && <div className="empty-state"><strong>No predictions yet.</strong><span>Your predictions will appear here after you make one.</span></div>}
      {!loading && !error && history.length > 0 && (
        <div className="history-list" aria-label="Prediction history">
          {history.map((item) => (
            <article className="panel history-row" key={item.id}>
              <div><strong>{item.questionTitle}</strong><span>Selected {item.answerText} · {new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))} PT</span></div>
              <div><span>{item.creditsCharged.toLocaleString()} credits · {(item.shares / 100).toFixed(2)} shares</span><strong className={item.outcome === "WON" ? "prediction-won" : item.outcome === "LOST" ? "prediction-lost" : ""}>{item.outcome === "WON" ? `Won · ${item.settlementAmount.toLocaleString()} credits paid` : item.outcome === "LOST" ? "Lost" : item.outcome === "REFUNDED" ? `Refunded · ${item.settlementAmount.toLocaleString()} credits returned` : "Pending"}</strong></div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("arena");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "leaderboard" || requestedView === "admin" || requestedView === "organizer" || requestedView === "sign-in") setView(requestedView);
    void getCurrentUser().then(setUser);
  }, []);
  const handleAuthenticated = async () => {
    setUser(await getCurrentUser());
    setView("arena");
  };
  const handleSignOut = async () => {
    await logout();
    setUser(null);
  };
  const openQuestion = (question: Question) => {
    window.location.href = `/questions/${encodeURIComponent(question.id)}`;
  };
  const content = useMemo(() => {
    if (view === "sign-in") return <SignIn mode={authMode} onBack={handleAuthenticated} />;
    if (view === "leaderboard") return <Leaderboard />;
    if (view === "profile") return user ? <PredictionHistory /> : <AuthPage initialMode="login" onAuthenticated={handleAuthenticated} />;
    if (view === "admin") return <AdminPage user={user} />;
    if (view === "organizer") return <OrganizerPage user={user} />;
    if (selectedQuestion) return <Detail onBack={() => setSelectedQuestion(null)} onSignIn={() => setView("sign-in")} question={selectedQuestion} />;
    return <Arena onOpen={openQuestion} />;
  }, [authMode, selectedQuestion, user, view]);
  if (view === "sign-in") return content;
  return <AppShell
    onAuthNavigate={(mode) => { setAuthMode(mode); setSelectedQuestion(null); setView("sign-in"); }}
    onNavigate={(next) => { setSelectedQuestion(null); setView(next); }}
    onSignOut={() => { void handleSignOut(); }}
    user={user}
    view={view}
  >{content}</AppShell>;
}
