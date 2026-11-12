import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPage } from "./auth-page.js";

describe("authentication page", () => {
  it("renders accessible registration and sign-in controls", () => {
    const markup = renderToStaticMarkup(createElement(AuthPage));

    expect(markup).toContain("Create your account");
    expect(markup).toContain('name="username"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain("Sign in");
    expect(markup).toContain("Already have an account?");
    expect(markup).toContain("At least 8 characters");
  });

  it("can render the sign-in mode directly", () => {
    const markup = renderToStaticMarkup(createElement(AuthPage, { initialMode: "login" }));

    expect(markup).toContain("Welcome back");
    expect(markup).not.toContain('name="username"');
    expect(markup).toContain("New to ForecastHub?");
    expect(markup).toContain("Create an account");
  });
});
