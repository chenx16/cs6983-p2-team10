import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthPage } from "./auth-page.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("authentication page", () => {
  it("explains invalid username characters without sending a registration request", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      user: { id: "user-1", username: "用户123", email: "person@example.com", role: "USER", balance: 1000 },
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(createElement(AuthPage));
    const interaction = userEvent.setup();
    await interaction.type(screen.getByLabelText("Username"), "用户123");
    await interaction.type(screen.getByLabelText("Email address"), "person@example.com");
    await interaction.type(screen.getByLabelText("Password"), "CorrectHorse1");
    await interaction.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText(/username.*letters.*numbers/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders accessible registration and sign-in controls", () => {
    const markup = renderToStaticMarkup(createElement(AuthPage));

    expect(markup).toContain("Create your account");
    expect(markup).toContain('name="username"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain("Sign in");
    expect(markup).toContain("Already have an account?");
    expect(markup).toContain("At least one uppercase letter");
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-label="Password requirements"');
    expect(markup).toContain("<svg");
  });

  it("can render the sign-in mode directly", () => {
    const markup = renderToStaticMarkup(createElement(AuthPage, { initialMode: "login" }));

    expect(markup).toContain("Welcome back");
    expect(markup).not.toContain('name="username"');
    expect(markup).toContain("New to ForecastHub?");
    expect(markup).toContain("Create an account");
  });
});
