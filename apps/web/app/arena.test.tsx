import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const question = {
  id: "question-1",
  title: "Will the home team win?",
  category: "Sports",
  status: "OPEN",
  deadline: "2030-06-02T01:00:00.000Z",
  eventTime: "2030-06-02T02:00:00.000Z",
  outcomeCriteria: "Official result",
  source: "Official source",
  totalCreditsSpent: 282,
  answers: [
    { id: "answer-a", text: "Yes", price: 67, creditsSpent: 208 },
    { id: "answer-b", text: "No", price: 33, creditsSpent: 74 },
  ],
};

const categories = () => new Response(JSON.stringify({
  categories: [{ id: "sports", name: "Sports" }, { id: "weather", name: "Weather" }],
}), { headers: { "Content-Type": "application/json" } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Arena question links", () => {
  it("links titles to the real detail page and answers to their preselected IDs", async () => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (input) => {
      if (String(input) === "/api/v1/private/me") {
        return new Response(null, { status: 401 });
      }
      if (String(input) === "/api/v1/public/categories") return categories();
      if (String(input).startsWith("/api/v1/public/questions")) {
        return new Response(JSON.stringify({ questions: [question] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    }));

    render(<HomePage />);
    const title = await screen.findByRole("link", { name: question.title });
    expect(title.getAttribute("href")).toBe("/questions/question-1");
    const card = title.closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByRole("link", { name: /yes/i }).getAttribute("href"))
      .toBe("/questions/question-1?answer=answer-a");
    expect(within(card!).getByRole("link", { name: /no/i }).getAttribute("href"))
      .toBe("/questions/question-1?answer=answer-b");
  });

  it("allows selecting more than one category", async () => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (input) => {
      if (String(input) === "/api/v1/private/me") return new Response(null, { status: 401 });
      if (String(input) === "/api/v1/public/categories") return categories();
      if (String(input).startsWith("/api/v1/public/questions")) {
        return new Response(JSON.stringify({
          questions: [question, { ...question, id: "question-2", title: "Will it rain?", category: "Weather" }],
        }), { headers: { "Content-Type": "application/json" } });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    }));

    render(<HomePage />);
    const sports = await screen.findByRole("button", { name: "Sports" });
    const weather = screen.getByRole("button", { name: "Weather" });
    fireEvent.click(sports);
    fireEvent.click(weather);
    expect(sports.getAttribute("aria-pressed")).toBe("true");
    expect(weather.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(question.title)).toBeTruthy();
    expect(screen.getByText("Will it rain?")).toBeTruthy();
  });

  it("requests and shows closed questions when the closed status is selected", async () => {
    vi.stubGlobal("React", React);
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === "/api/v1/private/me") return new Response(null, { status: 401 });
      if (String(input) === "/api/v1/public/categories") return categories();
      if (String(input).startsWith("/api/v1/public/questions")) {
        const url = new URL(String(input), "http://localhost");
        const questions = url.searchParams.get("status") === "CLOSED"
          ? [{ ...question, id: "closed-1", title: "Closed question", status: "CLOSED" }]
          : [question];
        return new Response(JSON.stringify({ questions }), { headers: { "Content-Type": "application/json" } });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HomePage />);
    await screen.findByText(question.title);
    fireEvent.click(screen.getByRole("button", { name: /^closed$/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) =>
        new URL(String(input), "http://localhost").searchParams.get("status") === "CLOSED",
      )).toBe(true);
    });
    expect(await screen.findByText("Closed question")).toBeTruthy();
  });
});

describe("authenticated navigation", () => {
  const signedInUser = {
    id: "user-1",
    username: "forecaster",
    email: "forecaster@example.com",
    role: "USER",
    balance: 1000,
  };

  const installSignedInApi = (me: () => Promise<Response> = async () => new Response(JSON.stringify({ user: signedInUser }), {
    headers: { "Content-Type": "application/json" },
  })) => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (input) => {
      const path = String(input);
      if (path === "/api/v1/private/me") return me();
      if (path === "/api/v1/private/predictions") {
        return new Response(JSON.stringify({ predictions: [] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (path === "/api/v1/public/categories") return categories();
      if (path.startsWith("/api/v1/public/questions")) {
        return new Response(JSON.stringify({ questions: [question] }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${path}`);
    }));
  };

  it("opens My predictions from the mobile menu with one click", async () => {
    installSignedInApi();
    render(<HomePage />);

    await screen.findByRole("button", { name: /my predictions/i });
    fireEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    const mobileNavigation = screen.getByRole("navigation", { name: /mobile primary navigation/i });
    fireEvent.click(within(mobileNavigation).getByRole("button", { name: /my predictions/i }));

    expect(await screen.findByRole("heading", { name: "Your predictions" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: /mobile primary navigation/i })).toBeNull();
    expect(await screen.findByText("No predictions yet.")).toBeTruthy();
  });

  it("shows a retry action when restoring a session fails", async () => {
    let attempts = 0;
    installSignedInApi(async () => {
      attempts++;
      if (attempts === 1) {
        return new Response(JSON.stringify({ error: { message: "Session service unavailable." } }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ user: signedInUser }), {
        headers: { "Content-Type": "application/json" },
      });
    });
    render(<HomePage />);

    expect(await screen.findByText(/session service unavailable/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: /my predictions/i })).toBeTruthy();
  });
});
