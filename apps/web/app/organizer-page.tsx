"use client";

import React, { useEffect, useState } from "react";
import type { AuthUser } from "./auth-client";
import { createQuestion, finalizeQuestion, getCategories, getOrganizerQuestions, getReadyToResolve, publishQuestion, resolveQuestion, type OrganizerCategory, type OrganizerQuestion, type ReadyQuestion, updateQuestion } from "./organizer-client";

const initialForm = { title: "", categoryId: "", answerA: "", answerB: "", startingPriceA: 50, deadline: "", eventTime: "", outcomeCriteria: "", source: "" };
type FormState = typeof initialForm;

const localDateTimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function OrganizerPage({ user }: { user: AuthUser | null }) {
  const [categories, setCategories] = useState<OrganizerCategory[]>([]);
  const [questions, setQuestions] = useState<OrganizerQuestion[]>([]);
  const [readyQuestions, setReadyQuestions] = useState<ReadyQuestion[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canOrganize = user?.role === "ORGANIZER" || user?.role === "ADMINISTRATOR";

  const load = async () => {
    try {
      const [categoryResponse, questionResponse, readyResponse] = await Promise.all([getCategories(), getOrganizerQuestions(), getReadyToResolve()]);
      setCategories(categoryResponse.categories);
      setQuestions(questionResponse.questions);
      setReadyQuestions(readyResponse.questions);
      setForm((current) => ({ ...current, categoryId: current.categoryId || categoryResponse.categories[0]?.id || "" }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load organizer tools.");
    } finally { setLoading(false); }
  };
  useEffect(() => { if (canOrganize) void load(); else setLoading(false); }, [canOrganize]);

  if (!user) return <Access title="Sign in required">Sign in with an Organizer account to continue.</Access>;
  if (!canOrganize) return <Access title="Access denied">Only Organizers and Administrators can create questions.</Access>;
  if (loading) return <p role="status">Loading organizer tools…</p>;

  const change = (field: keyof FormState, value: string | number) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    const deadline = new Date(form.deadline);
    const eventTime = new Date(form.eventTime);
    if (Number.isNaN(deadline.getTime()) || Number.isNaN(eventTime.getTime())) {
      setError("Enter both a deadline and event time.");
      return;
    }
    if (deadline > eventTime) {
      setError("Deadline must be at or before event time.");
      return;
    }
    try {
      const request = { ...form, deadline: deadline.toISOString(), eventTime: eventTime.toISOString() };
      const result = editing ? await updateQuestion(editing, request) : await createQuestion(request);
      setMessage(editing ? "Draft updated." : "Draft saved.");
      setQuestions((current) => editing ? current.map((question) => question.id === editing ? result.question : question) : [result.question, ...current]);
      setEditing(null); setForm({ ...initialForm, categoryId: form.categoryId });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save draft."); }
  };
  const edit = (question: OrganizerQuestion) => {
    setEditing(question.id);
    setForm({
      title: question.title,
      categoryId: categories.find((category) => category.name === question.category.name)?.id ?? "",
      answerA: question.answers[0]?.text ?? "",
      answerB: question.answers[1]?.text ?? "",
      startingPriceA: question.startingPriceA,
      deadline: localDateTimeValue(new Date(question.deadline)),
      eventTime: localDateTimeValue(new Date(question.eventTime)),
      outcomeCriteria: question.outcomeCriteria,
      source: question.source,
    });
  };
  const action = async (operation: () => Promise<unknown>, success: string) => {
    setError(""); setMessage("");
    try { await operation(); setMessage(success); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Organizer action failed."); }
  };
  const resolve = async (question: ReadyQuestion) => {
    const answerId = window.prompt(`Correct answer (${question.answers.map((answer) => answer.text).join(" / ")}):`, question.answers[0]?.id ?? "");
    if (!answerId) return;
    const evidenceNote = window.prompt("Evidence note:", "");
    if (!evidenceNote) return;
    await action(() => resolveQuestion(question.id, { answerId, evidenceNote }), "Question resolved and payouts issued.");
  };

  return <>
    <div className="breadcrumbs">ForecastHub <span>›</span> <b>Organizer</b></div>
    <div className="page-heading"><div><p className="eyebrow">Organizer workspace</p><h1>Create fair A/B questions.</h1><p className="muted">Save drafts, publish when ready, and finalize after the deadline.</p></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <div className="organizer-grid">
      <form className="panel organizer-form" onSubmit={(event) => void submit(event)}><div className="panel-heading"><div><p className="eyebrow">Question setup</p><h2>{editing ? "Edit draft" : "New draft"}</h2></div></div>
        <label>Question title<input required maxLength={200} onChange={(event) => change("title", event.target.value)} value={form.title} /></label>
        <label>Category<select required onChange={(event) => change("categoryId", event.target.value)} value={form.categoryId}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <div className="form-two"><label>Answer A<input required maxLength={40} onChange={(event) => change("answerA", event.target.value)} value={form.answerA} /></label><label>Answer B<input required maxLength={40} onChange={(event) => change("answerB", event.target.value)} value={form.answerB} /></label></div>
        <label>Starting price for A: {form.startingPriceA}<input max={90} min={10} onChange={(event) => change("startingPriceA", Number(event.target.value))} type="range" value={form.startingPriceA} /></label>
        <div className="form-two"><label>Deadline (Pacific Time)<input aria-describedby="deadline-help" required max={form.eventTime || undefined} min={localDateTimeValue(new Date())} onChange={(event) => change("deadline", event.target.value)} type="datetime-local" value={form.deadline} /><span className="field-help" id="deadline-help">Choose when predictions close.</span></label><label>Event time (Pacific Time)<input required min={form.deadline || localDateTimeValue(new Date())} onChange={(event) => change("eventTime", event.target.value)} type="datetime-local" value={form.eventTime} /></label></div>
        <label>Outcome criteria<textarea required maxLength={2000} onChange={(event) => change("outcomeCriteria", event.target.value)} value={form.outcomeCriteria} /></label><label>Trusted source<input required maxLength={500} onChange={(event) => change("source", event.target.value)} value={form.source} /></label>
        <div className="form-actions"><button className="button button-primary" type="submit">{editing ? "Save draft changes" : "Save draft"}</button>{editing && <button className="button" onClick={() => { setEditing(null); setForm({ ...initialForm, categoryId: form.categoryId }); }} type="button">Cancel edit</button>}</div>
      </form>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Ready to resolve</p><h2>Confirm outcomes</h2></div><span className="tag">{readyQuestions.length}</span></div><div className="admin-list">{readyQuestions.map((question) => <article className="admin-row" key={question.id}><div><strong>{question.title}</strong><span className="muted">{question.category.name} · deadline {new Date(question.deadline).toLocaleString()} · {question.answers.map((answer) => answer.text).join(" / ")}</span></div><button className="button button-primary" onClick={() => void resolve(question)} type="button">Resolve and pay</button></article>)}{readyQuestions.length === 0 && <p className="muted">No questions are ready to resolve.</p>}</div></section>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Your questions</p><h2>Question workspace</h2></div><span className="tag">{questions.length}</span></div><div className="admin-list">{questions.map((question) => <article className="admin-row" key={question.id}><div><strong>{question.title}</strong><span className="muted">{question.category.name} · {question.status} · {question._count.predictions} predictions</span></div><div className="form-actions">{question.status === "DRAFT" && <><button className="button" onClick={() => edit(question)} type="button">Edit</button><button className="button button-primary" onClick={() => void action(() => publishQuestion(question.id), "Question published.")} type="button">Publish</button></>}{question.status === "OPEN" && <button className="button button-danger" onClick={() => void action(() => finalizeQuestion(question.id), "Question finalized.")} type="button">Finalize after deadline</button>}</div></article>)}</div></section>
    </div>
  </>;
}

function Access({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel access-panel"><p className="eyebrow">Organizer workspace</p><h1>{title}</h1><p className="muted">{children}</p></section>; }
