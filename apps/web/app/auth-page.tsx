"use client";

import { FormEvent, useState } from "react";
import React from "react";
import { login, register } from "./auth-client";

type AuthPageProps = {
  onAuthenticated?: () => void;
};

export function AuthPage({ onAuthenticated }: AuthPageProps = {}) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await register({ username, email, password });
      } else {
        await login({ email, password });
      }
      onAuthenticated?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-view">
      <button className="brand auth-brand" onClick={onAuthenticated} type="button">
        <span className="brand-mark">↗</span> ForecastHub
      </button>
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{mode === "register" ? "Join the community" : "Welcome back"}</p>
        <h1>{mode === "register" ? "Create your account" : "Sign in"}</h1>
        <p className="muted">
          {mode === "register"
            ? "Make predictions, track your credits, and learn from the crowd."
            : "Continue tracking your predictions and credits."}
        </p>
        {mode === "register" && (
          <>
            <label className="field-label" htmlFor="username">Username</label>
            <input
              autoComplete="username"
              className="text-input"
              id="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </>
        )}
        <label className="field-label" htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          className="text-input"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <label className="field-label" htmlFor="password">Password</label>
        <input
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className="text-input"
          id="password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        {error && <p aria-live="polite" className="error-message" role="alert">{error}</p>}
        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
        </button>
        <p className="auth-foot">
          {mode === "register" ? "Already have an account?" : "New to ForecastHub?"}{" "}
          <button
            onClick={() => {
              setError("");
              setMode(mode === "register" ? "login" : "register");
            }}
            type="button"
          >
            {mode === "register" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </form>
    </div>
  );
}
