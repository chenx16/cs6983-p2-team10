"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthPage } from "./auth-page";
import { getCurrentUser, logout } from "./auth-client";
import type { AuthUser } from "./auth-client";
import { AppShell, type AuthMode, type View } from "./app-shell";
import { AdminPage } from "./admin-page";
import { OrganizerPage } from "./organizer-page";
import { getCategories, type OrganizerCategory } from "./organizer-client";
import { arenaQuestionsResponseSchema, leaderboardResponseSchema, predictionHistoryResponseSchema, type ArenaFilters, type ArenaQuestionResponse, type LeaderboardResponse, type PredictionHistoryResponse } from "@forecasthub/shared";

const statusFilters: { value: ArenaFilters["status"]; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSING_SOON", label: "Closing soon" },
  { value: "CLOSED", label: "Closed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CANCELLED", label: "Cancelled" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
}

function QuestionCard({ question }: { question: ArenaQuestionResponse }) {
  const firstAnswer = question.answers[0];
  const detailPath = `/questions/${encodeURIComponent(question.id)}`;
  const status = statusFilters.find((filter) => filter.value === question.status)?.label ?? question.status;
  const deadline = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(question.deadline));
  return (
    <article className="question-card">
      <div className="card-meta">
        <span><Icon>◈</Icon> {question.category}</span>
        <span className="tag">{status}</span>
      </div>
      <Link className="question-title" href={detailPath}>{question.title}</Link>
      <div className="answer-grid">
        {question.answers.map((answer, index) => (
          <Link className={`answer ${index === 0 ? "yes" : "no"}`} href={`${detailPath}?answer=${encodeURIComponent(answer.id)}`} key={answer.id}>
            <span>{answer.text}</span><strong>{answer.price}</strong>
          </Link>
        ))}
      </div>
      <div className="split-bar"><span style={{ width: `${firstAnswer?.price ?? 0}%` }} /></div>
      <div className="card-footer">
        <span>{deadline} PT</span><strong>{question.totalCreditsSpent.toLocaleString()} credits</strong>
      </div>
    </article>
  );
}

function Arena() {
  const [questions, setQuestions] = useState<ArenaQuestionResponse[]>([]);
  const [categories, setCategories] = useState<OrganizerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadedStatus, setLoadedStatus] = useState<ArenaFilters["status"]>("OPEN");
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<ArenaFilters["status"]>("OPEN");

  useEffect(() => {
    let active = true;
    void getCategories()
      .then((result) => { if (active) setCategories(result.categories); })
      .catch((requestError: unknown) => {
        if (active) setCategoryError(requestError instanceof Error ? requestError.message : "Unable to load categories.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ status });
    selectedCategories.forEach((category) => query.append("category", category));
    setLoading(true);
    setError("");
    void fetch(`/api/v1/public/questions?${query}`, { credentials: "include" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Unable to load Arena questions.");
        return arenaQuestionsResponseSchema.parse(payload);
      })
      .then((payload) => {
        if (!active) return;
        setQuestions(payload.questions);
        setLoadedStatus(status);
        setLoaded(true);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load Arena questions.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedCategories, status]);
  const visibleQuestions = questions.filter((question) =>
    selectedCategories.length === 0 || categories.some((category) =>
      selectedCategories.includes(category.id) && category.name === question.category,
    ),
  );

  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>{statusFilters.find((filter) => filter.value === status)?.label}</b></div>
      <div className="page-heading">
        <div><p className="eyebrow">The Arena</p><h1>Questions worth thinking about.</h1><p className="muted">Browse published questions by topic and status.</p></div>
      </div>
      <div className="status-filters" role="group" aria-label="Question status">
        {statusFilters.map((filter) => <button aria-pressed={status === filter.value} key={filter.value} onClick={() => setStatus(filter.value)} type="button">{filter.label}</button>)}
      </div>
      <div className="topic-tabs" aria-label="Question topics">
        <button aria-pressed={selectedCategories.length === 0} onClick={() => setSelectedCategories([])} type="button">All topics</button>
        {categories.map((category) => <button aria-pressed={selectedCategories.includes(category.id)} key={category.id} onClick={() => setSelectedCategories((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])} type="button">{category.name}</button>)}
      </div>
      {categoryError && <p className="error-message" role="alert">{categoryError}</p>}
      {loading && <p role="status">Loading published questions…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {loaded && loadedStatus === status && !error && <div aria-busy={loading} className="question-grid">
        {visibleQuestions.map((question) => <QuestionCard key={question.id} question={question} />)}
      </div>}
      {!loading && !error && visibleQuestions.length === 0 && <div className="empty-state"><strong>No questions match these filters.</strong><span>Try a different topic or status.</span></div>}
      <p className="privacy-note">All times are Pacific Time. Credits are virtual only and cannot be bought, sold, or exchanged for money.</p>
    </>
  );
}

function SignIn({ mode, onBack }: { mode: AuthMode; onBack: () => void | Promise<void> }) {
  return <AuthPage initialMode={mode} onAuthenticated={onBack} />;
}

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse["entries"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/public/leaderboard", { credentials: "include" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Unable to load the leaderboard.");
        return leaderboardResponseSchema.parse(payload);
      })
      .then((payload) => {
        if (active) setLeaderboard(payload.entries);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load the leaderboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <><div className="breadcrumbs">ForecastHub <span>›</span> <b>Leaderboard</b></div><div className="page-heading"><div><p className="eyebrow">All time</p><h1>Forecast well. Learn publicly.</h1></div></div><div className="panel leaderboard-panel"><table><caption className="sr-only">ForecastHub leaderboard</caption><thead><tr><th>Rank</th><th>Username</th><th>Scored questions</th><th>Success rate</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading leaderboard…</td></tr> : error ? <tr><td colSpan={4} className="error-message">{error}</td></tr> : leaderboard.length === 0 ? <tr><td colSpan={4}>No resolved predictions yet.</td></tr> : leaderboard.map((row) => <tr key={row.username}><td>{row.rank ?? "Not ranked yet"}</td><td><strong>{row.username}</strong></td><td>{row.scoredQuestions}</td><td>{row.successRate}%</td></tr>)}</tbody></table></div></>;
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
  const content = useMemo(() => {
    if (view === "sign-in") return <SignIn mode={authMode} onBack={handleAuthenticated} />;
    if (view === "leaderboard") return <Leaderboard />;
    if (view === "profile") return user ? <PredictionHistory /> : <AuthPage initialMode="login" onAuthenticated={handleAuthenticated} />;
    if (view === "admin") return <AdminPage user={user} />;
    if (view === "organizer") return <OrganizerPage user={user} />;
    return <Arena />;
  }, [authMode, user, view]);
  if (view === "sign-in") return content;
  return <AppShell
    onAuthNavigate={(mode) => { setAuthMode(mode); setView("sign-in"); }}
    onNavigate={setView}
    onSignOut={() => { void handleSignOut(); }}
    user={user}
    view={view}
  >{content}</AppShell>;
}
