"use client";

import { FormEvent, useState } from "react";
import React from "react";
import { login, register } from "./auth-client";

export type AuthPageProps = {
  initialMode?: "register" | "login";
  onAuthenticated?: () => void | Promise<void>;
};

export const AuthPage: React.FunctionComponent<AuthPageProps> = ({ initialMode = "register", onAuthenticated }) => {
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRequirements = [
    { valid: password.length >= 8, label: "At least 8 characters" },
    { valid: /[A-Z]/.test(password), label: "At least one uppercase letter" },
    { valid: /[a-z]/.test(password), label: "At least one lowercase letter" },
    { valid: /[0-9]/.test(password), label: "At least one number" },
    { valid: password !== username && password !== email, label: "Cannot be your username or email" },
  ];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (mode === "register") {
      setPasswordSubmitted(true);
      const validPassword = password.length >= 8
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /[0-9]/.test(password)
        && password !== username
        && password !== email;
      if (!validPassword) {
        setError("Please fix the highlighted password requirements.");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await register({ username, email, password });
      } else {
        await login({ identifier, password });
      };
      await onAuthenticated?.();
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
        <label className="field-label" htmlFor={mode === "register" ? "email" : "identifier"}>{mode === "register" ? "Email address" : "Username or email"}</label>
        <input
          autoComplete={mode === "register" ? "email" : "username"}
          className="text-input"
          id={mode === "register" ? "email" : "identifier"}
          name={mode === "register" ? "email" : "identifier"}
          onChange={(event) => mode === "register" ? setEmail(event.target.value) : setIdentifier(event.target.value)}
          required
          type={mode === "register" ? "email" : "text"}
          value={mode === "register" ? email : identifier}
        />
        <label className="field-label" htmlFor="password">Password</label>
        <div className="password-field">
          <input
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="text-input"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d={showPassword
                ? "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                : "M3 3l18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-4.1 4.5M6.1 6.1C3.4 8.1 2 12 2 12s3.5 6 10 6c1.3 0 2.5-.2 3.6-.7"} />
            </svg>
          </button>
        </div>
        {mode === "register" && (
          <ul aria-label="Password requirements" className="password-requirements">
            {passwordRequirements.map(({ valid, label }) => (
              <li className={passwordSubmitted || password ? (valid ? "valid" : "invalid") : ""} key={label}>
                <span aria-hidden="true">{valid ? "✓" : "!"}</span> {label}
              </li>
            ))}
          </ul>
        )}
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
