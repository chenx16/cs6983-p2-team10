"use client";

import React, { useEffect, useState } from "react";
import type { AuthUser } from "./auth-client";
import {
  cancelAdminQuestion,
  getAdminQuestions,
  getAdminUsers,
  type AdminQuestion,
  type AdminUser,
  updateUserRole,
} from "./admin-client";

export function AdminPage({ user }: { user: AuthUser | null }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setPageError("");
    try {
      const [userResponse, questionResponse] = await Promise.all([getAdminUsers(), getAdminQuestions()]);
      setUsers(userResponse.users);
      setQuestions(questionResponse.questions);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load administrator tools.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMINISTRATOR") void refresh();
    else setLoading(false);
  }, [user]);

  if (!user) {
    return <section className="panel access-panel"><p className="eyebrow">Administrator tools</p><h1>Sign in required</h1><p className="muted">Sign in with an Administrator account to continue.</p></section>;
  }
  if (user.role !== "ADMINISTRATOR") {
    return <section className="panel access-panel"><p className="eyebrow">Administrator tools</p><h1>Access denied</h1><p className="muted">Only Administrators can view or use these tools.</p></section>;
  }

  return (
    <>
      <div className="breadcrumbs">ForecastHub <span>›</span> <b>Administration</b></div>
      <div className="page-heading">
        <div><p className="eyebrow">Administrator tools</p><h1>Keep ForecastHub organized.</h1><p className="muted">Role changes and cancellations are validated and recorded by the server.</p></div>
        <button className="button" disabled={loading} onClick={() => void refresh()} type="button">Refresh data</button>
      </div>
      {loading && <p role="status">Loading administrator data…</p>}
      {pageError && <p className="error-message" role="alert">{pageError}</p>}
      {!loading && !pageError && (
        <div className="admin-grid">
          <RoleManagement users={users} onUpdated={() => void refresh()} />
          <QuestionManagement questions={questions} onUpdated={() => void refresh()} />
        </div>
      )}
    </>
  );
}

function RoleManagement({ users, onUpdated }: { users: AdminUser[]; onUpdated: () => void }) {
  return <section className="panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">People</p><h2>Manage roles</h2></div><span className="tag">{users.length} accounts</span></div><div className="admin-list">{users.map((account) => <RoleRow account={account} key={account.id} onUpdated={onUpdated} />)}</div></section>;
}

function RoleRow({ account, onUpdated }: { account: AdminUser; onUpdated: () => void }) {
  const [role, setRole] = useState<AdminUser["role"]>(account.role);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const changed = role !== account.role;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed) return;
    if (!reason.trim()) {
      setError("Enter a reason for this role change.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      await updateUserRole(account.id, role, reason.trim());
      setMessage("Role updated.");
      setReason("");
      onUpdated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update this role.");
    } finally {
      setPending(false);
    }
  };

  return <form className="admin-row" onSubmit={(event) => void submit(event)}><div><strong>{account.username}</strong><span className="muted">{account.email}</span></div><label>Role<select aria-label={`Role for ${account.username}`} disabled={pending} onChange={(event) => setRole(event.target.value as AdminUser["role"])} value={role}><option value="USER">User</option><option value="ORGANIZER">Organizer</option><option value="ADMINISTRATOR">Administrator</option></select></label><label>Reason<input aria-label={`Reason for ${account.username}`} disabled={pending} onChange={(event) => setReason(event.target.value)} placeholder="Why is this changing?" value={reason} /></label><button className="button button-primary" disabled={pending || !changed} type="submit">{pending ? "Saving…" : "Save role"}</button>{error && <span className="error-message" role="alert">{error}</span>}{message && <span className="success-message" role="status">{message}</span>}</form>;
}

function QuestionManagement({ questions, onUpdated }: { questions: AdminQuestion[]; onUpdated: () => void }) {
  return <section className="panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">Moderation</p><h2>Questions</h2></div><span className="tag">{questions.length} questions</span></div><div className="admin-list">{questions.map((question) => <QuestionRow key={question.id} onUpdated={onUpdated} question={question} />)}</div></section>;
}

function QuestionRow({ question, onUpdated }: { question: AdminQuestion; onUpdated: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canCancel = question.status !== "CANCELLED" && question.status !== "RESOLVED";

  const submit = async () => {
    if (!reason.trim()) {
      setError("Enter a cancellation reason.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await cancelAdminQuestion(question.id, reason.trim());
      setMessage(`Cancelled and refunded ${result.refunded.toLocaleString()} credits.`);
      onUpdated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel this question.");
    } finally {
      setPending(false);
    }
  };

  return <div className="admin-row"><div><strong>{question.title}</strong><span className="muted">{question.status} · {question.predictionCount} predictions</span></div>{canCancel ? <><label>Cancellation reason<input aria-label={`Cancellation reason for ${question.title}`} disabled={pending} onChange={(event) => setReason(event.target.value)} placeholder="Why is this cancelled?" value={reason} /></label><button className="button button-danger" disabled={pending} onClick={() => void submit()} type="button">{pending ? "Cancelling…" : "Cancel question"}</button></> : <span className="tag">{question.status}</span>}{error && <span className="error-message" role="alert">{error}</span>}{message && <span className="success-message" role="status">{message}</span>}</div>;
}
