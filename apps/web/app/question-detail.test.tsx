/// <reference types="vite/client" />

import React, { type ComponentType } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "question-1" }),
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const pages = import.meta.glob<{ default: ComponentType<{ params: Promise<{ id: string }> }> }>(
  "./questions/**/page.tsx",
);

const question = {
  id: "question-1",
  title: "Will the home team win?",
  category: "Sports",
  status: "OPEN",
  deadline: "2030-06-02T01:00:00.000Z",
  eventTime: "2030-06-02T02:00:00.000Z",
  outcomeCriteria: "The official result determines the outcome.",
  source: "Official league results",
  totalCreditsSpent: 282,
  answers: [
    { id: "answer-a", text: "Yes", price: 67, creditsSpent: 208 },
    { id: "answer-b", text: "No", price: 33, creditsSpent: 74 },
  ],
};

const user = {
  id: "user-1",
  username: "test-user",
  email: "test@example.com",
  role: "USER",
  balance: 1000,
};

const prediction = {
  answerId: "answer-a",
  answerText: "Yes",
  creditsCharged: 208,
  shares: 354,
  payoutIfCorrect: 354,
  createdAt: "2029-01-02T03:04:05.000Z",
};

const preview = {
  questionId: question.id,
  answerId: "answer-a",
  shares: 354,
  charge: 208,
  averagePrice: 58.8,
  prices: { a: 67, b: 33 },
  payoutIfCorrect: 354,
  balance: 1000,
  marketVersion: 1,
};

const paths = {
  question: "/api/v1/public/questions/question-1",
  me: "/api/v1/private/me",
  predictions: "/api/v1/private/questions/question-1/predictions",
  preview: "/api/v1/private/questions/question-1/predictions/preview",
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

const installApi = (options: {
  signedIn?: boolean;
  questionResponse?: Response;
  place?: (request: RequestInit) => Promise<Response>;
} = {}) => {
  let placed = false;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = String(input);
    if (path === paths.question) {
      return options.questionResponse?.clone() ?? json(placed ? {
        ...question,
        answers: [
          { ...question.answers[0], price: 70 },
          { ...question.answers[1], price: 30 },
        ],
      } : question);
    }
    if (path === paths.me) {
      return options.signedIn === false
        ? json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required." } }, 401)
        : json({ user: placed ? { ...user, balance: 792 } : user });
    }
    if (path === paths.preview) return json(preview);
    if (path === paths.predictions && init?.method === "POST") {
      if (!options.place) throw new Error("Unexpected prediction submission");
      const response = await options.place(init);
      if (response.ok) placed = true;
      return response;
    }
    if (path === paths.predictions) {
      return json({ predictions: placed ? [prediction, { ...prediction, shares: 300, payoutIfCorrect: 300 }] : [prediction] });
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const requestsFor = (fetchMock: FetchMock, path: string, method?: string) =>
  fetchMock.mock.calls.filter(([input, init]) =>
    String(input) === path && (!method || (init?.method ?? "GET") === method),
  );

const renderPage = async () => {
  const loadPage = pages["./questions/[id]/page.tsx"];
  expect(loadPage, "The question detail route must exist").toBeDefined();
  const { default: Page } = await loadPage!();
  return render(<Page params={Promise.resolve({ id: "question-1" })} />);
};

const preparePreview = async () => {
  await screen.findByRole("heading", { name: question.title });
  await userEvent.click(screen.getByRole("radio", { name: /yes/i }));
  fireEvent.change(screen.getByLabelText(/credits to spend/i), { target: { value: "208" } });
  await screen.findByText(/58\.8/);
};

beforeEach(() => {
  window.history.replaceState({}, "", "/questions/question-1");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("question detail and prediction panel", () => {
  it("loads the public question, crowd prices and Pacific deadline", async () => {
    const fetchMock = installApi();
    await renderPage();

    expect(await screen.findByRole("heading", { name: question.title })).toBeTruthy();
    expect(screen.getByText(question.outcomeCriteria)).toBeTruthy();
    expect(screen.getByText(question.source)).toBeTruthy();
    expect(screen.getByText(/sports/i)).toBeTruthy();
    expect(screen.getByText(/282/)).toBeTruthy();
    expect(screen.getByText(/67%/)).toBeTruthy();
    expect(screen.getByText(/33%/)).toBeTruthy();
    const deadline = screen.getByText("Deadline").parentElement!;
    expect(within(deadline).getByText(/pacific|PDT|PT/i)).toBeTruthy();
    expect(within(deadline).getByText(/jun(?:e)?\s+1/i)).toBeTruthy();
    expect(requestsFor(fetchMock, paths.question)).toHaveLength(1);
  });

  it("shows a not-found state for a missing question", async () => {
    installApi({
      questionResponse: json({ error: { code: "QUESTION_NOT_FOUND", message: "Question not found." } }, 404),
    });
    await renderPage();
    expect(await screen.findByText(/question not found/i)).toBeTruthy();
  });

  it("preselects a matching answer from the query string", async () => {
    window.history.replaceState({}, "", "/questions/question-1?answer=answer-b");
    installApi();
    await renderPage();
    await screen.findByRole("heading", { name: question.title });
    expect((screen.getByRole("radio", { name: /no/i }) as HTMLInputElement).checked).toBe(true);
  });

  it("prompts visitors to sign in before predicting", async () => {
    const fetchMock = installApi({ signedIn: false });
    await renderPage();
    expect(await screen.findByText(/sign in to predict/i)).toBeTruthy();
    expect(requestsFor(fetchMock, paths.predictions)).toHaveLength(0);
  });

  it("shows balance and only the user's predictions, shares and potential payout", async () => {
    installApi();
    await renderPage();
    const section = await screen.findByRole("region", { name: /your predictions/i });
    expect(screen.getByText(/1,000/)).toBeTruthy();
    expect(within(section).getByText(/yes/i)).toBeTruthy();
    expect(within(section).getByText(/208/)).toBeTruthy();
    expect(within(section).getByText(/3\.54/)).toBeTruthy();
    expect(within(section).getByText(/354/)).toBeTruthy();
    expect(within(section).getByText(/2029/)).toBeTruthy();
  });

  it("debounces preview requests and uses the latest budget", async () => {
    const fetchMock = installApi();
    await renderPage();
    await screen.findByRole("heading", { name: question.title });
    await userEvent.click(screen.getByRole("radio", { name: /yes/i }));
    const input = screen.getByLabelText(/credits to spend/i);
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.change(input, { target: { value: "208" } });
    expect(requestsFor(fetchMock, paths.preview)).toHaveLength(0);
    await waitFor(() => expect(requestsFor(fetchMock, paths.preview)).toHaveLength(1));
    const [, init] = requestsFor(fetchMock, paths.preview)[0]!;
    expect(JSON.parse(String(init?.body))).toMatchObject({ answerId: "answer-a", budget: 208 });
    expect(await screen.findByText(/58\.8/)).toBeTruthy();
    const previewSection = screen.getByRole("region", { name: /preview/i });
    expect(within(previewSection).getByText(/3\.54/)).toBeTruthy();
    expect(within(previewSection).getByText(/208/)).toBeTruthy();
  });

  it("shows the new preview after a price change and requires another confirmation", async () => {
    const changedPreview = { ...preview, shares: 300, averagePrice: 69.3, prices: { a: 70, b: 30 } };
    const fetchMock = installApi({
      place: async () => json({
        error: { code: "PRICE_CHANGED", message: "The price changed." },
        preview: changedPreview,
      }, 409),
    });
    await renderPage();
    await preparePreview();
    await userEvent.click(screen.getByRole("button", { name: /confirm prediction/i }));
    expect(await screen.findByText(/price changed/i)).toBeTruthy();
    expect(screen.getByText(/69\.3/)).toBeTruthy();
    expect(requestsFor(fetchMock, paths.predictions, "POST")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /confirm prediction/i }));
    await waitFor(() => expect(requestsFor(fetchMock, paths.predictions, "POST")).toHaveLength(2));
    const bodies = requestsFor(fetchMock, paths.predictions, "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies[0]).toMatchObject({ answerId: "answer-a", budget: 208, minShares: 354 });
    expect(bodies[1]).toMatchObject({ answerId: "answer-a", budget: 208, minShares: 300 });
    expect(bodies[1].idempotencyKey).not.toBe(bodies[0].idempotencyKey);
  });

  it("shows a clear closed state when the question deadline has passed", async () => {
    installApi({
      questionResponse: json({ ...question, deadline: "2020-06-02T01:00:00.000Z" }),
    });
    await renderPage();
    expect(await screen.findByText(/predictions closed/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /confirm prediction/i })).toBeNull();
  });

  it("shows an insufficient balance message without submitting a prediction", async () => {
    const fetchMock = installApi();
    await renderPage();
    await screen.findByRole("heading", { name: question.title });
    await userEvent.click(screen.getByRole("radio", { name: /yes/i }));
    fireEvent.change(screen.getByLabelText(/credits to spend/i), { target: { value: "1001" } });
    expect(await screen.findByText(/insufficient|not enough|exceeds.*balance/i)).toBeTruthy();
    expect(requestsFor(fetchMock, paths.predictions, "POST")).toHaveLength(0);
  });

  it("disables confirmation while submission is in progress", async () => {
    let resolvePlacement!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolvePlacement = resolve; });
    installApi({ place: () => pending });
    await renderPage();
    await preparePreview();
    const button = screen.getByRole("button", { name: /confirm prediction/i });
    await userEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    resolvePlacement(json({
      prediction: {
        id: "prediction-1", answerId: "answer-a", shares: 354, creditsCharged: 208,
        priceA: 67, priceB: 33, createdAt: prediction.createdAt,
      },
      balance: 792,
    }, 201));
    await screen.findByText(/792/);
  });

  it("refreshes balance, crowd prices and personal predictions after a successful placement", async () => {
    const fetchMock = installApi({
      place: async () => json({
        prediction: {
          id: "prediction-1", answerId: "answer-a", shares: 354, creditsCharged: 208,
          priceA: 67, priceB: 33, createdAt: prediction.createdAt,
        },
        balance: 792,
      }, 201),
    });
    await renderPage();
    await preparePreview();
    await userEvent.click(screen.getByRole("button", { name: /confirm prediction/i }));
    await screen.findByText(/792/);
    expect(await screen.findByText(/70%/)).toBeTruthy();
    const section = await screen.findByRole("region", { name: /your predictions/i });
    expect(await within(section).findByText(/300/)).toBeTruthy();
    await waitFor(() => {
      expect(requestsFor(fetchMock, paths.question).length).toBeGreaterThanOrEqual(2);
      expect(requestsFor(fetchMock, paths.predictions, "GET").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("reuses the same idempotency key after a network error when retrying", async () => {
    let attempts = 0;
    const fetchMock = installApi({
      place: async () => {
        attempts++;
        if (attempts === 1) throw new TypeError("Network request failed");
        return json({
          prediction: {
            id: "prediction-1", answerId: "answer-a", shares: 354, creditsCharged: 208,
            priceA: 67, priceB: 33, createdAt: prediction.createdAt,
          },
          balance: 792,
        }, 200);
      },
    });
    await renderPage();
    await preparePreview();
    await userEvent.click(screen.getByRole("button", { name: /confirm prediction/i }));
    expect(await screen.findByText(/network|connection/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(requestsFor(fetchMock, paths.predictions, "POST")).toHaveLength(2));
    const submissions = requestsFor(fetchMock, paths.predictions, "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(submissions[0].idempotencyKey).toBeTruthy();
    expect(submissions[1]).toEqual(submissions[0]);
  });

  it("keeps the original key if an uncertain submission's retry is rate limited", async () => {
    let attempts = 0;
    const fetchMock = installApi({
      place: async () => {
        attempts++;
        if (attempts === 1) throw new TypeError("Network request failed");
        if (attempts === 2) return json({ error: { code: "RATE_LIMITED", message: "Try again later." } }, 429);
        return json({
          prediction: {
            id: "prediction-1", answerId: "answer-a", shares: 354, creditsCharged: 208,
            priceA: 67, priceB: 33, createdAt: prediction.createdAt,
          },
          balance: 792,
        });
      },
    });
    await renderPage();
    await preparePreview();
    await userEvent.click(screen.getByRole("button", { name: /confirm prediction/i }));
    await screen.findByText(/network|connection/i);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText(/try again later/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(requestsFor(fetchMock, paths.predictions, "POST")).toHaveLength(3));
    const submissions = requestsFor(fetchMock, paths.predictions, "POST")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(submissions[1]).toEqual(submissions[0]);
    expect(submissions[2]).toEqual(submissions[0]);
  });
});
