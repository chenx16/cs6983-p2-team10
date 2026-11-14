"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  apiErrorSchema,
  myQuestionPredictionsResponseSchema,
  predictionPreviewResponseSchema,
  publicQuestionPriceUpdateSchema,
  questionDetailResponseSchema,
  type MyQuestionPredictionsResponse,
  type PlacePredictionRequest,
  type PredictionPreviewResponse,
  type QuestionDetailResponse,
} from "@forecasthub/shared";
import { AuthPage } from "../../auth-page";
import { getCurrentUser, logout, type AuthUser } from "../../auth-client";
import { AppShell, type AuthMode } from "../../app-shell";

type PreviewSelection = {
  answerId: string;
  budget: number;
  result: PredictionPreviewResponse;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly payload: unknown,
  ) {
    super(message);
  }
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { credentials: "include", ...init });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "REQUEST_FAILED",
      parsed.success ? parsed.data.error.message : `Request failed (${response.status}).`,
      payload,
    );
  }
  return payload;
}

function postJson(body: object): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function pacificTime(value: string) {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))} Pacific Time`;
}

const sharesText = (shares: number) => (shares / 100).toFixed(2);
const creditsText = (credits: number) => credits.toLocaleString("en-US");

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const questionPath = `/api/v1/public/questions/${encodeURIComponent(id)}`;
  const predictionsPath = `/api/v1/private/questions/${encodeURIComponent(id)}/predictions`;
  const previewPath = `${predictionsPath}/preview`;
  const [question, setQuestion] = useState<QuestionDetailResponse | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [predictions, setPredictions] = useState<MyQuestionPredictionsResponse["predictions"]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageError, setPageError] = useState("");
  const [privateError, setPrivateError] = useState("");
  const [authView, setAuthView] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [answerId, setAnswerId] = useState("");
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<PreviewSelection | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PlacePredictionRequest | null>(null);
  const [serverClosed, setServerClosed] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"Live" | "Reconnecting…">("Live");
  const [now, setNow] = useState(() => Date.now());
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPageError("");
    setNotFound(false);
    setPrivateError("");
    setQuestion(null);
    setUser(null);
    setPredictions([]);
    setAnswerId("");
    setPreview(null);
    setServerClosed(false);

    void Promise.all([
      requestJson(questionPath).then((value) => questionDetailResponseSchema.parse(value)),
      getCurrentUser(),
    ]).then(async ([detail, currentUser]) => {
      if (!active) return;
      setQuestion(detail);
      setUser(currentUser);
      const requestedAnswer = new URLSearchParams(window.location.search).get("answer");
      const selectedAnswer = detail.answers.find((answer) => answer.id === requestedAnswer) ?? detail.answers[0];
      if (!selectedAnswer) throw new Error("This question has no available answers.");
      setAnswerId(selectedAnswer.id);
      setLoading(false);
      if (currentUser) {
        try {
          const value = await requestJson(predictionsPath);
          if (active) setPredictions(myQuestionPredictionsResponseSchema.parse(value).predictions);
        } catch (error) {
          if (active) setPrivateError(error instanceof Error ? error.message : "Unable to load your predictions.");
        }
      }
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 404) setNotFound(true);
      else setPageError(error instanceof Error ? error.message : "Unable to load this question.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [questionPath, predictionsPath]);

  useEffect(() => {
    if (!question || typeof WebSocket === "undefined") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const streamUrl = `${apiUrl.replace(/^http/, "ws")}/api/v1/public/questions/${encodeURIComponent(id)}/stream`;
    let active = true;
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryDelay = 1000;
    const connect = () => {
      if (!active) return;
      socket = new WebSocket(streamUrl);
      socket.onopen = () => {
        retryDelay = 1000;
        setLiveStatus("Live");
      };
      socket.onmessage = (event) => {
        try {
          const update = publicQuestionPriceUpdateSchema.parse(JSON.parse(event.data));
          setQuestion((current) => current && current.id === update.questionId ? {
            ...current,
            totalCreditsSpent: update.totalCreditsSpent,
            answers: current.answers.map((answer) => {
              const next = update.answers.find((candidate) => candidate.id === answer.id);
              return next ? { ...answer, price: next.price, creditsSpent: next.creditsSpent } : answer;
            }),
          } : current);
        } catch {
          setLiveStatus("Reconnecting…");
        }
      };
      socket.onclose = () => {
        if (!active) return;
        setLiveStatus("Reconnecting…");
        retryTimer = window.setTimeout(() => {
          void requestJson(questionPath)
            .then((value) => questionDetailResponseSchema.parse(value))
            .then((latest) => { if (active) setQuestion(latest); })
            .catch(() => undefined)
            .finally(() => {
              if (active) connect();
            });
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 5000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [id, question?.id, questionPath]);

  useEffect(() => {
    if (!question) return;
    const remaining = new Date(question.deadline).getTime() - now;
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [question, now]);

  const closed = Boolean(
    question && (serverClosed || question.status !== "OPEN" || new Date(question.deadline).getTime() <= now),
  );
  const budget = Number(amount);
  const validBudget = Number.isSafeInteger(budget) && budget >= 10;
  const insufficient = Boolean(user && validBudget && budget > user.balance);

  useEffect(() => {
    setPreview(null);
    setPreviewLoading(false);
    if (!user || !answerId || !validBudget || insufficient || closed || pending) return;
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      setFormError("");
      void requestJson(previewPath, {
        ...postJson({ answerId, budget }),
        signal: controller.signal,
      }).then((value) => {
        const result = predictionPreviewResponseSchema.parse(value);
        if (active) setPreview({ answerId, budget, result });
      }).catch((error: unknown) => {
        if (active) setFormError(error instanceof Error ? error.message : "Unable to preview your prediction.");
      }).finally(() => {
        if (active) setPreviewLoading(false);
      });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [answerId, budget, validBudget, insufficient, closed, pending, previewPath, user]);

  async function refreshAfterPlacement(balance: number) {
    setUser((current) => current ? { ...current, balance } : current);
    const results = await Promise.allSettled([
      requestJson(questionPath).then((value) => questionDetailResponseSchema.parse(value)),
      requestJson(predictionsPath).then((value) => myQuestionPredictionsResponseSchema.parse(value)),
      getCurrentUser(),
    ]);
    const [detail, personal, currentUser] = results;
    const errors: string[] = [];
    if (detail.status === "fulfilled") setQuestion(detail.value);
    else errors.push("crowd prices");
    if (personal.status === "fulfilled") setPredictions(personal.value.predictions);
    else errors.push("your predictions");
    if (currentUser.status === "fulfilled") setUser(currentUser.value);
    else errors.push("your balance");
    setPrivateError(errors.length ? `Prediction saved, but could not refresh ${errors.join(", ")}. Reload the page.` : "");
  }

  async function submitPrediction(request: PlacePredictionRequest) {
    if (submittingRef.current) return;
    const retrying = pending?.idempotencyKey === request.idempotencyKey;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    setNotice("");
    try {
      const result = await requestJson(predictionsPath, postJson(request));
      if (
        typeof result !== "object" || result === null || !("balance" in result) ||
        typeof result.balance !== "number" || !Number.isSafeInteger(result.balance)
      ) {
        throw new Error("The prediction response was invalid.");
      }
      setPending(null);
      setPreview(null);
      setAmount("");
      setNotice("Prediction placed. Your prediction cannot be changed or withdrawn.");
      await refreshAfterPlacement(result.balance);
    } catch (error) {
      if (error instanceof ApiError && error.code === "PRICE_CHANGED") {
        const payload = error.payload;
        const updated = typeof payload === "object" && payload !== null && "preview" in payload
          ? predictionPreviewResponseSchema.safeParse(payload.preview)
          : null;
        if (updated?.success) {
          setPending(null);
          setPreview({ answerId: request.answerId, budget: request.budget, result: updated.data });
          setFormError("The price changed. Review the new preview and confirm again.");
        } else {
          setPending(null);
          setPreview(null);
          setFormError("The price changed, but the new preview was invalid. Change the amount to try again.");
        }
      } else if (error instanceof ApiError && error.status < 500) {
        if (!retrying) {
          setPending(null);
          setPreview(null);
        }
        if (error.code === "QUESTION_CLOSED" || error.code === "QUESTION_NOT_OPEN") setServerClosed(true);
        setFormError(retrying && (error.code === "QUESTION_CLOSED" || error.code === "QUESTION_NOT_OPEN")
          ? `${error.message} The earlier submission could not be verified; contact support before trying again.`
          : error.message);
        if (retrying && error.status === 401) {
          setAuthMode("login");
          setAuthView(true);
        }
      } else {
        setPending(request);
        setFormError("A network or server error interrupted confirmation. Retry to safely check the same prediction.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function confirmPrediction() {
    if (!preview || preview.answerId !== answerId || preview.budget !== budget || closed || submitting || pending) return;
    void submitPrediction({
      answerId,
      budget,
      minShares: preview.result.shares,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async function finishAuthentication(authenticatedUser?: AuthUser) {
    try {
      setPrivateError("");
      setPageError("");
      setUser(authenticatedUser ?? await getCurrentUser());
      setAuthView(false);
      if (authenticatedUser) {
        const value = await requestJson(predictionsPath);
        setPredictions(myQuestionPredictionsResponseSchema.parse(value).predictions);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load your account.");
      setAuthView(false);
    }
  }

  async function handleSignOut() {
    try {
      await logout();
      setUser(null);
      setPredictions([]);
      setPageError("");
      setPrivateError("");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  if (authView) return <AuthPage initialMode={authMode} onAuthenticated={finishAuthentication} />;

  return (
    <AppShell
      view="arena"
      user={user}
      signOutDisabled={submitting || Boolean(pending)}
      onNavigate={(view) => router.push(view === "leaderboard" ? "/?view=leaderboard" : "/")}
      onAuthNavigate={(mode) => { setAuthMode(mode); setAuthView(true); }}
      onSignOut={() => { void handleSignOut(); }}
    >
        <a className="back-link detail-back-link" href="/">← Back to Arena</a>
        {loading && <p role="status">Loading question…</p>}
        {notFound && <div className="empty-state"><strong>Question not found.</strong></div>}
        {pageError && <p className="error-message" role="alert">{pageError}</p>}
        {question && (
          <>
            <header className="detail-heading">
              <p className="eyebrow">{question.category} · {question.status}</p>
              <h1>{question.title}</h1>
              <p className="muted">{creditsText(question.totalCreditsSpent)} credits spent</p>
            </header>
            {question.status === "RESOLVED" && question.correctAnswerId && (
              <section className="panel resolution-result" aria-label="Question result">
                <p className="eyebrow">Final result</p>
                <h2>{question.answers.find((answer) => answer.id === question.correctAnswerId)?.text}</h2>
                {question.resolutionNote && <p className="muted">{question.resolutionNote}</p>}
              </section>
            )}
            <div className="detail-grid">
              <div className="detail-main">
                <section className="panel" aria-labelledby="crowd-heading">
                  <h2 id="crowd-heading">What the crowd thinks</h2>
                  <div className="big-answers">
                    {question.answers.map((answer, index) => (
                      <div className={`big-answer ${index === 0 ? "yes" : "no"}`} key={answer.id}>
                        <span>{answer.text}</span><strong>{answer.price}%</strong>
                        <span>{creditsText(answer.creditsSpent)} credits spent</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel" aria-labelledby="about-heading">
                  <h2 id="about-heading">About this question</h2>
                  <dl className="facts">
                    <div><dt>How it resolves</dt><dd>{question.outcomeCriteria}</dd></div>
                    <div><dt>Trusted source</dt><dd>{question.source}</dd></div>
                    <div><dt>Deadline</dt><dd>{pacificTime(question.deadline)}</dd></div>
                    <div><dt>Event time</dt><dd>{pacificTime(question.eventTime)}</dd></div>
                  </dl>
                </section>
                {user && (
                  <section className="panel" aria-labelledby="personal-heading">
                    <h2 id="personal-heading">Your predictions</h2>
                    {privateError && <p className="error-message" role="alert">{privateError}</p>}
                    {predictions.length === 0 ? <p className="muted">No predictions yet.</p> : (
                      <ul className="personal-predictions">
                        {predictions.map((item, index) => (
                          <li key={`${item.createdAt}-${index}`}>
                            <strong>{item.answerText}</strong>
                            <span>{creditsText(item.creditsCharged)} credits spent</span>
                            <span>{sharesText(item.shares)} shares</span>
                            {item.won === undefined ? <span>{creditsText(item.payoutIfCorrect)} credits if correct</span> : <strong className={item.won ? "prediction-won" : "prediction-lost"}>{item.won ? `Won · ${creditsText(item.payoutIfCorrect)} credits paid` : "Lost"}</strong>}
                            <time dateTime={item.createdAt}>{pacificTime(item.createdAt)}</time>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
              <aside className="panel prediction-panel">
                <h2>Make a prediction</h2>
                <span className="live" aria-live="polite"><i /> {liveStatus}</span>
                {user && <p className="balance">Balance: {creditsText(user.balance)} credits</p>}
                {closed ? (
                  <>
                    <p className="closed">Predictions closed at {pacificTime(question.deadline)}.</p>
                    {formError && <p className="error-message" role="alert">{formError}</p>}
                    {pending && !serverClosed && <p className="error-message" role="alert">Your earlier submission could not be verified before the deadline. Contact support before trying again.</p>}
                  </>
                ) : !user ? (
                  <button className="button button-primary" onClick={() => { setAuthMode("login"); setAuthView(true); }} type="button">Sign in to predict</button>
                ) : (
                  <>
                    <fieldset disabled={submitting || Boolean(pending)}>
                      <legend>Choose an answer</legend>
                      {question.answers.map((answer) => (
                        <label className={`choice ${answerId === answer.id ? "selected" : ""}`} key={answer.id}>
                          <input checked={answerId === answer.id} name="answer" onChange={() => { setAnswerId(answer.id); setFormError(""); setNotice(""); }} type="radio" />
                          <span>{answer.text}</span>
                        </label>
                      ))}
                    </fieldset>
                    <label className="field-label" htmlFor="prediction-amount">Credits to spend</label>
                    <div className="amount-input">
                      <input disabled={submitting || Boolean(pending)} id="prediction-amount" min="10" onChange={(event) => { setAmount(event.target.value); setFormError(""); setNotice(""); }} step="1" type="number" value={amount} />
                      <span>credits</span>
                    </div>
                    {amount && !validBudget && <p className="error-message">Enter at least 10 whole credits.</p>}
                    {insufficient && <p className="error-message" role="alert">Insufficient balance for this amount.</p>}
                    {previewLoading && <p role="status">Loading preview…</p>}
                    {preview && preview.answerId === answerId && preview.budget === budget && (
                      <section className="preview-box" aria-labelledby="preview-heading">
                        <strong id="preview-heading">Preview</strong>
                        <span>{sharesText(preview.result.shares)} shares</span>
                        <span>Charge: {creditsText(preview.result.charge)} credits</span>
                        <span>Average price: {preview.result.averagePrice.toFixed(1)}</span>
                        <span>Prices after prediction: {preview.result.prices.a} / {preview.result.prices.b}</span>
                        <span>{creditsText(preview.result.payoutIfCorrect)} credits if correct</span>
                      </section>
                    )}
                    {formError && <p className="error-message" role="alert">{formError}</p>}
                    {notice && <p role="status">{notice}</p>}
                    {pending ? (
                      <button className="button button-primary" disabled={submitting} onClick={() => void submitPrediction(pending)} type="button">Retry</button>
                    ) : (
                      <button className="button button-primary" disabled={!preview || previewLoading || submitting || insufficient} onClick={confirmPrediction} type="button">Confirm prediction</button>
                    )}
                    <p className="fine-print">Predictions are timestamped and cannot be changed or withdrawn.</p>
                  </>
                )}
              </aside>
            </div>
          </>
        )}
    </AppShell>
  );
}
