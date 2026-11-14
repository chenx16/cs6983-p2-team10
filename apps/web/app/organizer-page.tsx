"use client";

import React, { useEffect, useState } from "react";
import type { AuthUser } from "./auth-client";
import { createQuestion, finalizeQuestion, getCategories, getOrganizerQuestions, getReadyToResolve, publishQuestion, resolveQuestion, type OrganizerCategory, type OrganizerQuestion, type ReadyQuestion, updateQuestion } from "./organizer-client";

const initialForm = { title: "", categoryId: "", answerA: "", answerB: "", startingPriceA: 50, deadline: "", eventTime: "", outcomeCriteria: "", source: "" };
type FormState = typeof initialForm;
type OrganizerTab = "questions" | "drafts" | "resolve";

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
  const [tab, setTab] = useState<OrganizerTab>("questions");
  const [resolutionTarget, setResolutionTarget] = useState<ReadyQuestion | null>(null);
  const [resolutionAnswerId, setResolutionAnswerId] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
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
    setTab("drafts");
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
    try { await operation(); setMessage(success); await load(); return true; } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Organizer action failed."); return false; }
  };
  const resolve = async (question: ReadyQuestion) => {
    setResolutionTarget(question);
    setResolutionAnswerId(question.answers[0]?.id ?? "");
    setEvidenceNote("");
  };
  const submitResolution = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resolutionTarget || !resolutionAnswerId || !evidenceNote.trim()) return;
    const resolvedId = resolutionTarget.id;
    const succeeded = await action(() => resolveQuestion(resolvedId, { answerId: resolutionAnswerId, evidenceNote: evidenceNote.trim() }), "Question resolved and payouts issued.");
    if (!succeeded) return;
    setReadyQuestions((current) => current.filter((question) => question.id !== resolvedId));
    setResolutionTarget(null);
  };

  return <>
    <div className="breadcrumbs">ForecastHub <span>›</span> <b>Organizer</b></div>
    <div className="page-heading"><div><p className="eyebrow">Organizer workspace</p><h1>Create fair A/B questions.</h1><p className="muted">Save drafts, publish when ready, and finalize after the deadline.</p></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}
    <nav className="organizer-tabs" aria-label="Organizer workspace tabs">
      {([["questions", "My Questions"], ["drafts", "Edit Drafts"], ["resolve", "Resolve"]] as const).map(([value, label]) => <button className={tab === value ? "active" : ""} aria-selected={tab === value} key={value} onClick={() => setTab(value)} role="tab" type="button">{label}{value === "resolve" && readyQuestions.length > 0 ? ` (${readyQuestions.length})` : ""}</button>)}
    </nav>
    {tab === "drafts" && <div className="organizer-grid">
      <form className="panel organizer-form" onSubmit={(event) => void submit(event)}><div className="panel-heading"><div><p className="eyebrow">Question setup</p><h2>{editing ? "Edit draft" : "New draft"}</h2></div></div>
        <label>Question title<input required maxLength={200} onChange={(event) => change("title", event.target.value)} value={form.title} /></label>
        <label>Category<select required onChange={(event) => change("categoryId", event.target.value)} value={form.categoryId}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <div className="form-two"><label>Answer A<input required maxLength={40} onChange={(event) => change("answerA", event.target.value)} value={form.answerA} /></label><label>Answer B<input required maxLength={40} onChange={(event) => change("answerB", event.target.value)} value={form.answerB} /></label></div>
        <label>Starting price for A: {form.startingPriceA}<input max={90} min={10} onChange={(event) => change("startingPriceA", Number(event.target.value))} type="range" value={form.startingPriceA} /></label>
        <div className="form-two"><label>Deadline (Pacific Time)<input aria-describedby="deadline-help" required max={form.eventTime || undefined} min={localDateTimeValue(new Date())} onChange={(event) => change("deadline", event.target.value)} type="datetime-local" value={form.deadline} /><span className="field-help" id="deadline-help">Choose when predictions close.</span></label><label>Event time (Pacific Time)<input required min={form.deadline || localDateTimeValue(new Date())} onChange={(event) => change("eventTime", event.target.value)} type="datetime-local" value={form.eventTime} /></label></div>
        <label>Outcome criteria<textarea required maxLength={2000} onChange={(event) => change("outcomeCriteria", event.target.value)} value={form.outcomeCriteria} /></label><label>Trusted source<input required maxLength={500} onChange={(event) => change("source", event.target.value)} value={form.source} /></label>
        <div className="form-actions"><button className="button button-primary" type="submit">{editing ? "Save draft changes" : "Save draft"}</button>{editing && <button className="button" onClick={() => { setEditing(null); setForm({ ...initialForm, categoryId: form.categoryId }); }} type="button">Cancel edit</button>}</div>
      </form>
    </div>}
    {tab === "questions" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Created by you</p><h2>My Questions</h2></div><div className="form-actions"><span className="tag">{questions.length}</span><button className="button button-primary" onClick={() => { setEditing(null); setForm({ ...initialForm, categoryId: categories[0]?.id ?? "" }); setTab("drafts"); }} type="button">New draft</button></div></div><div className="admin-list">{questions.map((question) => <article className="admin-row" key={question.id}><div><strong>{question.title}</strong><span className="muted">{question.category.name} · {question.status} · deadline {new Date(question.deadline).toLocaleString()} · {question._count.predictions} predictions</span></div><div className="form-actions">{question.status === "DRAFT" && <button className="button" onClick={() => edit(question)} type="button">Edit draft</button>}{question.status === "OPEN" && <button className="button button-danger" onClick={() => void action(() => finalizeQuestion(question.id), "Question finalized.")} type="button">Finalize after deadline</button>}</div></article>)}{questions.length === 0 && <p className="muted">You have not created any questions yet.</p>}</div></section>}
    {tab === "resolve" && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">After the deadline</p><h2>Resolve Questions</h2></div><span className="tag">{readyQuestions.length}</span></div><div className="admin-list">{readyQuestions.map((question) => <article className="admin-row" key={question.id}><div><strong>{question.title}</strong><span className="muted">{question.category.name} · deadline {new Date(question.deadline).toLocaleString()} · {question.answers.map((answer) => answer.text).join(" / ")}</span></div><button className="button button-primary" onClick={() => resolve(question)} type="button">Choose result</button></article>)}{readyQuestions.length === 0 && <p className="muted">No questions are ready to resolve.</p>}</div></section>}
    {resolutionTarget && <form className="panel resolution-form" onSubmit={(event) => void submitResolution(event)}><div className="panel-heading"><div><p className="eyebrow">Resolution</p><h2>{resolutionTarget.title}</h2></div></div><label>Correct answer<select required onChange={(event) => setResolutionAnswerId(event.target.value)} value={resolutionAnswerId}>{resolutionTarget.answers.map((answer) => <option key={answer.id} value={answer.id}>{answer.text}</option>)}</select></label><label>Evidence note<textarea required maxLength={2000} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Describe the trusted source result." value={evidenceNote} /></label><div className="form-actions"><button className="button button-primary" type="submit">Resolve and pay out</button><button className="button" onClick={() => setResolutionTarget(null)} type="button">Cancel</button></div></form>}
  </>;
}

function Access({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel access-panel"><p className="eyebrow">Organizer workspace</p><h1>{title}</h1><p className="muted">{children}</p></section>; }
