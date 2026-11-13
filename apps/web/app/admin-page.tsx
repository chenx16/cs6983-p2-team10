"use client";

import React, { useEffect, useState } from "react";
import type { AuthUser } from "./auth-client";
import {
  cancelAdminQuestion,
  getAdminHistory,
  getAdminQuestions,
  getAdminUsers,
  type AdminHistoryEntry,
  type AdminQuestion,
  type AdminUser,
  updateUserRole,
} from "./admin-client";

type Tab = "people" | "questions" | "history";

export function AdminPage({ user }: { user: AuthUser | null }) {
  const [tab, setTab] = useState<Tab>("people");
  if (!user) return <AccessPanel title="Sign in required">Sign in with an Administrator account to continue.</AccessPanel>;
  if (user.role !== "ADMINISTRATOR") return <AccessPanel title="Access denied">Only Administrators can view or use these tools.</AccessPanel>;

  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>Administration</b></div>
      <div className="page-heading"><div><p className="eyebrow">Administrator tools</p><h1>Keep ForecastHub organized.</h1><p className="muted">Search focused records, or review the complete audit history.</p></div></div>
      <div aria-label="Administrator sections" className="admin-tabs" role="tablist">
        <button aria-selected={tab === "people"} onClick={() => setTab("people")} role="tab" type="button">People</button>
        <button aria-selected={tab === "questions"} onClick={() => setTab("questions")} role="tab" type="button">Questions</button>
        <button aria-selected={tab === "history"} onClick={() => setTab("history")} role="tab" type="button">Admin history</button>
      </div>
      {tab === "people" && <RoleManagement />}
      {tab === "questions" && <QuestionManagement />}
      {tab === "history" && <History />}
    </>
  );
}

function AccessPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel access-panel"><p className="eyebrow">Administrator tools</p><h1>{title}</h1><p className="muted">{children}</p></section>;
}

function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  return <div className="admin-pager"><span>Page {page} of {Math.max(pageCount, 1)}</span><div><button className="button" disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">Previous</button><button className="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} type="button">Next</button></div></div>;
}

function RoleManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [data, setData] = useState<{ users: AdminUser[]; pageCount: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const load = async () => {
    try { setError(""); setData(await getAdminUsers(page, submittedSearch)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load users."); }
  };
  useEffect(() => { void load(); }, [page, submittedSearch]);
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); };
  return <section className="panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">People</p><h2>Manage roles</h2></div>{data && <span className="tag">{data.total} accounts</span>}</div><form className="admin-search" onSubmit={submitSearch}><label>Search users<input aria-label="Search users" onChange={(event) => setSearch(event.target.value)} placeholder="Username or email" value={search} /></label><button className="button" type="submit">Search</button></form>{error && <p className="error-message" role="alert">{error}</p>}<div className="admin-list">{data?.users.map((account) => <RoleRow account={account} key={account.id} onUpdated={load} />)}</div>{data && <Pager onChange={setPage} page={page} pageCount={data.pageCount} />}</section>;
}

function RoleRow({ account, onUpdated }: { account: AdminUser; onUpdated: () => void }) {
  const [role, setRole] = useState(account.role);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (role === account.role) return;
    if (!reason.trim()) { setError("Enter a reason for this role change."); return; }
    setPending(true); setError(""); setMessage("");
    try { await updateUserRole(account.id, role, reason.trim()); setMessage("Role updated."); setReason(""); onUpdated(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update this role."); } finally { setPending(false); }
  };
  return <form className="admin-row" onSubmit={(event) => void submit(event)}><div><strong>{account.username}</strong><span className="muted">{account.email}</span></div><label>Role<select aria-label={`Role for ${account.username}`} disabled={pending} onChange={(event) => setRole(event.target.value as AdminUser["role"])} value={role}><option value="USER">User</option><option value="ORGANIZER">Organizer</option><option value="ADMINISTRATOR">Administrator</option></select></label><label>Reason<input aria-label={`Reason for ${account.username}`} disabled={pending} onChange={(event) => setReason(event.target.value)} placeholder="Why is this changing?" value={reason} /></label><button className="button button-primary" disabled={pending || role === account.role} type="submit">{pending ? "Saving…" : "Save role"}</button>{error && <span className="error-message" role="alert">{error}</span>}{message && <span className="success-message" role="status">{message}</span>}</form>;
}

function QuestionManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [data, setData] = useState<{ questions: AdminQuestion[]; pageCount: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const load = async () => { try { setError(""); setData(await getAdminQuestions(page, submittedSearch)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load questions."); } };
  useEffect(() => { void load(); }, [page, submittedSearch]);
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); };
  return <section className="panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">Moderation</p><h2>Questions</h2></div>{data && <span className="tag">{data.total} questions</span>}</div><form className="admin-search" onSubmit={submitSearch}><label>Search questions<input aria-label="Search questions" onChange={(event) => setSearch(event.target.value)} placeholder="Question title" value={search} /></label><button className="button" type="submit">Search</button></form>{error && <p className="error-message" role="alert">{error}</p>}<div className="admin-list">{data?.questions.map((question) => <QuestionRow key={question.id} onUpdated={load} question={question} />)}</div>{data && <Pager onChange={setPage} page={page} pageCount={data.pageCount} />}</section>;
}

function QuestionRow({ question, onUpdated }: { question: AdminQuestion; onUpdated: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canCancel = question.status !== "CANCELLED" && question.status !== "RESOLVED";
  const submit = async () => {
    if (!reason.trim()) { setError("Enter a cancellation reason."); return; }
    setPending(true); setError(""); setMessage("");
    try { const result = await cancelAdminQuestion(question.id, reason.trim()); setMessage(`Cancelled and refunded ${result.refunded.toLocaleString()} credits.`); onUpdated(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to cancel this question."); } finally { setPending(false); }
  };
  return <div className="admin-row"><div><strong>{question.title}</strong><span className="muted">{question.status} · {question.predictionCount} predictions</span></div>{canCancel ? <><label>Cancellation reason<input aria-label={`Cancellation reason for ${question.title}`} disabled={pending} onChange={(event) => setReason(event.target.value)} placeholder="Why is this cancelled?" value={reason} /></label><button className="button button-danger" disabled={pending} onClick={() => void submit()} type="button">{pending ? "Cancelling…" : "Cancel question"}</button></> : <span className="tag">{question.status}</span>}{error && <span className="error-message" role="alert">{error}</span>}{message && <span className="success-message" role="status">{message}</span>}</div>;
}

function History() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: AdminHistoryEntry[]; pageCount: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const load = async () => { try { setError(""); setData(await getAdminHistory(page)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load administrator history."); } };
  useEffect(() => { void load(); }, [page]);
  return <section className="panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">Audit trail</p><h2>Administrator history</h2></div>{data && <span className="tag">{data.total} records</span>}</div><p className="muted">Immutable records of role changes, cancellations, and refunds.</p>{error && <p className="error-message" role="alert">{error}</p>}<div className="history-list">{data?.entries.map((entry) => <article className="history-entry" key={entry.id}><div><strong>{entry.action === "ROLE_CHANGE" ? "Role change" : "Question cancellation"}</strong><span className="muted">{new Date(entry.createdAt).toLocaleString()} · by {entry.responsibleUser.username}</span></div><p>{entry.targetUser ? `User: ${entry.targetUser.username}` : `Question: ${entry.question?.title ?? "Unknown question"}`}</p><p>{entry.reason}{entry.amount !== null ? ` · ${entry.amount.toLocaleString()} credits` : ""}</p></article>)}</div>{data && <Pager onChange={setPage} page={page} pageCount={data.pageCount} />}</section>;
}
