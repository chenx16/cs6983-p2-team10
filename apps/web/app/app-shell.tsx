"use client";

import React, { type ReactNode } from "react";
import type { AuthUser } from "./auth-client";

export type View = "arena" | "leaderboard" | "profile" | "sign-in";
export type AuthMode = "register" | "login";

const apiDocsUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/docs/`;
const roleLabel = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

export function AppShell({
  view,
  onNavigate,
  onAuthNavigate,
  user,
  onSignOut,
  signOutDisabled = false,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onAuthNavigate: (mode: AuthMode) => void;
  user: AuthUser | null;
  onSignOut: () => void;
  signOutDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("arena")}><span className="brand-mark">↗</span> ForecastHub</button>
        <nav aria-label="Primary navigation" className="nav-links">
          <button className={view === "arena" ? "active" : ""} onClick={() => onNavigate("arena")}><span aria-hidden="true" className="icon">⌂</span> Arena</button>
          <button className={view === "leaderboard" ? "active" : ""} onClick={() => onNavigate("leaderboard")}><span aria-hidden="true" className="icon">♜</span> Leaderboard</button>
          <a href={apiDocsUrl}><span aria-hidden="true" className="icon">⌁</span> API docs</a>
        </nav>
        <div className="sidebar-bottom">
          <p>Credits are virtual and free.</p>
          {user ? (
            <div className="user-card">
              <strong>{user.username}</strong>
              {user.role === "ADMINISTRATOR" && <span>{roleLabel(user.role)}</span>}
              <span>{user.balance.toLocaleString()} credits</span>
              <button className="button" disabled={signOutDisabled} onClick={onSignOut} type="button">Sign out</button>
            </div>
          ) : (
            <>
              <button className="button" onClick={() => onAuthNavigate("login")} type="button">Sign in</button>
              <button className="button button-primary" onClick={() => onAuthNavigate("register")} type="button">Register</button>
            </>
          )}
        </div>
      </aside>
      <div className="mobile-bar">
        <button className="brand" onClick={() => onNavigate("arena")}><span className="brand-mark">↗</span> ForecastHub</button>
        <button className="mobile-menu" aria-label="Open navigation" onClick={() => onNavigate("leaderboard")}>☰</button>
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
