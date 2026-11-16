import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { AppShell } from "./app-shell.js";

afterEach(() => {
  cleanup();
});

const user = {
  id: "user-1",
  username: "test-user",
  email: "test@example.com",
  role: "USER" as const,
  balance: 1000,
};

const renderShell = (role: "USER" | "ORGANIZER" | "ADMINISTRATOR") =>
  render(createElement(AppShell, {
    view: "arena",
    onNavigate: () => undefined,
    onAuthNavigate: () => undefined,
    user: { ...user, role },
    onSignOut: () => undefined,
    children: createElement("p", null, "content"),
  }));

describe("application navigation", () => {
  it("shows Organizer only to organizers", () => {
    renderShell("ORGANIZER");
    expect(screen.getByRole("button", { name: /organizer/i })).toBeTruthy();

    cleanup();
    renderShell("ADMINISTRATOR");
    expect(screen.queryByRole("button", { name: /organizer/i })).toBeNull();
  });
});
