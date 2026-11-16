const jsonResponse = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});

const requestBody = (schema: string, example: unknown) => ({
  required: true,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` }, example } },
});

const error = (description: string, code: string, message: string) =>
  jsonResponse(description, { error: { code, message } });

const errors = {
  invalid: error("Invalid request (INVALID_INPUT; category errors may use INVALID_CATEGORY). The message varies by endpoint.", "INVALID_INPUT", "Invalid question filters."),
  unauthenticated: error("Missing, expired, or invalid session; the account may be inactive.", "UNAUTHENTICATED", "Authentication is required."),
  forbidden: error("The account lacks the required role.", "FORBIDDEN", "Organizer access is required."),
  adminForbidden: error("The account lacks the administrator role.", "FORBIDDEN", "Administrator access is required."),
  notFound: error("The requested resource was not found or is not accessible.", "NOT_FOUND", "Question not found."),
  userNotFound: error("The user was not found.", "NOT_FOUND", "User not found."),
  publicNotFound: error("The public question was not found or is not visible.", "QUESTION_NOT_FOUND", "Question not found."),
  conflict: error("The action conflicts with the current resource state.", "INVALID_ACTION", "Only draft questions can be published."),
  rateLimited: error("Rate limit exceeded; messages vary by endpoint. Check the Retry-After response header when present.", "RATE_LIMITED", "Too many question detail requests. Try again later."),
  invalidMarket: error("INVALID_INPUT, INVALID_ANSWER, INSUFFICIENT_BALANCE, INVALID_QUESTION_TYPE, or INVALID_MARKET.", "INVALID_INPUT", "Prediction details are invalid."),
};

const cookieSecurity = [{ cookieAuth: [] }];
const questionId = { name: "questionId", in: "path", required: true, description: "Question ID.", schema: { type: "string" } };
const userId = { name: "userId", in: "path", required: true, description: "User ID.", schema: { type: "string" } };
const page = { name: "page", in: "query", description: "Page number; defaults to 1. Page size is 10.", schema: { type: "integer", minimum: 1, default: 1 } };
const search = { name: "search", in: "query", description: "Case-insensitive search; at most 100 characters.", schema: { type: "string", maxLength: 100 } };

const health = { status: "ok", service: "forecasthub-api", timestamp: "2030-01-01T12:00:00.000Z" };
const user = { id: "user-1", username: "forecaster", email: "forecaster@example.test", role: "USER", balance: 1000 };
const questionInput = {
  title: "Will the home team win?", categoryId: "category-1", answerA: "Yes", answerB: "No",
  startingPriceA: 50, deadline: "2030-06-01T18:00:00.000Z", eventTime: "2030-06-01T19:00:00.000Z",
  outcomeCriteria: "The official final score determines the result.", source: "Official league results",
};
const questionRecord = {
  id: "question-1", title: questionInput.title, type: "AB", status: "DRAFT",
  categoryId: "category-1", organizerId: "organizer-1", deadline: questionInput.deadline,
  eventTime: questionInput.eventTime, timeZone: "America/Los_Angeles", outcomeCriteria: questionInput.outcomeCriteria,
  source: questionInput.source, startingPriceA: 50, aSharesHundredths: 0, bSharesHundredths: 0,
  marketVersion: 0, isHidden: false, resolutionNote: null, correctAnswerId: null, publishedAt: null,
  resolvedAt: null, createdAt: "2030-01-01T12:00:00.000Z", updatedAt: "2030-01-01T12:00:00.000Z",
};
const organizerQuestion = {
  ...questionRecord, category: { name: "Sports" },
  answers: [{ id: "answer-a", text: "Yes" }, { id: "answer-b", text: "No" }], _count: { predictions: 0 },
};
const publicQuestion = {
  id: "question-1", title: questionInput.title, category: "Sports", status: "OPEN",
  deadline: questionInput.deadline, eventTime: questionInput.eventTime,
  outcomeCriteria: questionInput.outcomeCriteria, source: questionInput.source, totalCreditsSpent: 0,
  answers: [{ id: "answer-a", text: "Yes", price: 50, creditsSpent: 0 }, { id: "answer-b", text: "No", price: 50, creditsSpent: 0 }],
};
const preview = {
  questionId: "question-1", answerId: "answer-a", shares: 183, charge: 100,
  averagePrice: 54.6448087431694, prices: { a: 59, b: 41 }, payoutIfCorrect: 183, balance: 1000, marketVersion: 0,
};
const placement = {
  prediction: { id: "prediction-1", answerId: "answer-a", shares: 183, creditsCharged: 100, priceA: 59, priceB: 41, createdAt: "2030-01-01T12:00:00.000Z" },
  balance: 900,
};
const privateErrors = { "401": errors.unauthenticated };
const organizerErrors = { ...privateErrors, "403": errors.forbidden, "429": errors.rateLimited };
const adminErrors = { ...privateErrors, "403": errors.adminForbidden, "429": errors.rateLimited };
const predictionErrors = {
  ...privateErrors,
  "403": error("Administrators cannot predict, and organizers cannot predict on their own questions.", "FORBIDDEN", "Administrators cannot make predictions."),
  "404": errors.publicNotFound,
  "409": error("QUESTION_NOT_OPEN or QUESTION_CLOSED.", "QUESTION_CLOSED", "The prediction deadline has passed."),
  "422": errors.invalidMarket, "429": errors.rateLimited,
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ForecastHub API",
    version: "0.1.0",
    description: "Public routes require no login. Private routes require the access_token cookie; organizer and administrator routes also require the stated role. Credits are virtual.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/health": { get: { summary: "Check process health", responses: { "200": jsonResponse("Healthy.", health) } } },
    "/api/v1/public/health": { get: { summary: "Check API health", responses: { "200": jsonResponse("Healthy.", health) } } },
    "/api/v1/public/questions": {
      get: {
        summary: "List public A/B questions",
        description: "Published, visible questions; defaults to open questions ordered by deadline. MULTI_ANSWER returns an empty list.",
        parameters: [
          { name: "category", in: "query", description: "Repeat to filter by multiple category IDs.", style: "form", explode: true, schema: { type: "array", items: { type: "string" } } },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "CLOSING_SOON", "CLOSED", "RESOLVED", "CANCELLED"], default: "OPEN" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["AB", "MULTI_ANSWER"], default: "AB" } },
        ],
        responses: { "200": jsonResponse("Aggregate questions.", { questions: [publicQuestion] }), "400": errors.invalid, "429": errors.rateLimited },
      },
    },
    "/api/v1/public/questions/{questionId}": {
      get: {
        summary: "Get public question details", parameters: [questionId],
        responses: {
          "200": jsonResponse("Public details and aggregate prices.", { ...publicQuestion, resolutionNote: null, correctAnswerId: null }),
          "404": errors.publicNotFound, "422": error("The question has an invalid A/B market.", "INVALID_MARKET", "Question market is invalid."), "429": errors.rateLimited,
        },
      },
    },
    "/api/v1/public/questions/{questionId}/stream": {
      get: {
        summary: "Subscribe to public price updates over WebSocket",
        description: "Upgrade this URL to WebSocket for a published, visible, open A/B question. Example message: {\"questionId\":\"question-1\",\"marketVersion\":1,\"prices\":{\"a\":59,\"b\":41},\"answers\":[{\"id\":\"answer-a\",\"price\":59,\"creditsSpent\":100},{\"id\":\"answer-b\",\"price\":41,\"creditsSpent\":0}],\"totalCreditsSpent\":100}. Invalid or unavailable streams are disconnected.",
        parameters: [questionId], responses: { "101": { description: "WebSocket connection established." } },
      },
    },
    "/api/v1/public/categories": { get: { summary: "List categories", responses: { "200": jsonResponse("Categories.", { categories: [{ id: "category-1", name: "Sports" }] }) } } },
    "/api/v1/public/leaderboard": {
      get: {
        summary: "Get the public leaderboard",
        description: "No balances or net gains are exposed. Users with fewer than five scored questions have a null rank.",
        responses: { "200": jsonResponse("Leaderboard.", { entries: [{ rank: 1, username: "forecaster", scoredQuestions: 5, successRate: 80 }] }), "429": errors.rateLimited },
      },
    },
    "/api/v1/auth/register": {
      post: {
        summary: "Register and receive an HttpOnly access cookie",
        requestBody: requestBody("RegisterRequest", { username: "forecaster", email: "forecaster@example.test", password: "ExamplePass123" }),
        responses: {
          "201": jsonResponse("Account created and cookie set.", { user }), "400": errors.invalid,
          "409": error("Username or email is already in use.", "DUPLICATE_ACCOUNT", "An account with that email or username already exists."),
          "429": errors.rateLimited,
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        summary: "Sign in and receive an HttpOnly access cookie",
        requestBody: requestBody("LoginRequest", { identifier: "forecaster", password: "ExamplePass123" }),
        responses: {
          "200": jsonResponse("Signed in and cookie set.", { user }), "400": errors.invalid,
          "401": error("Credentials are invalid or the account is inactive.", "INVALID_CREDENTIALS", "Username/email or password is incorrect."),
          "429": errors.rateLimited,
        },
      },
    },
    "/api/v1/auth/logout": { post: { summary: "Clear the access cookie", responses: { "204": { description: "Cookie cleared; no response body." }, "429": errors.rateLimited } } },
    "/api/v1/private/me": {
      get: { summary: "Get the authenticated user", security: cookieSecurity, responses: { "200": jsonResponse("Current user.", { user }), ...privateErrors, "429": errors.rateLimited } },
    },
    "/api/v1/private/predictions": {
      get: {
        summary: "Get the authenticated user's prediction history", security: cookieSecurity,
        responses: {
          "200": jsonResponse("Private history.", { predictions: [{ id: "prediction-1", questionId: "question-1", questionTitle: questionInput.title, answerText: "Yes", questionStatus: "OPEN", deadline: questionInput.deadline, creditsCharged: 100, shares: 183, outcome: "PENDING", settlementAmount: 0, createdAt: "2030-01-01T12:00:00.000Z" }] }),
          ...privateErrors, "429": errors.rateLimited,
        },
      },
    },
    "/api/v1/private/questions/{questionId}/predictions": {
      get: {
        summary: "Get the user's predictions for a question", security: cookieSecurity, parameters: [questionId],
        responses: {
          "200": jsonResponse("Private predictions.", { predictions: [{ answerId: "answer-a", answerText: "Yes", creditsCharged: 100, shares: 183, payoutIfCorrect: 183, createdAt: "2030-01-01T12:00:00.000Z" }] }),
          ...privateErrors, "404": errors.publicNotFound, "429": errors.rateLimited,
        },
      },
      post: {
        summary: "Place an A/B prediction", security: cookieSecurity, parameters: [questionId],
        description: "The idempotency key is scoped to the user. Repeating a successful key returns the existing result with HTTP 200.",
        requestBody: requestBody("PlacePredictionRequest", { answerId: "answer-a", budget: 100, minShares: 183, idempotencyKey: "prediction-request-1" }),
        responses: { "200": jsonResponse("Existing idempotent result.", placement), "201": jsonResponse("Prediction placed.", placement), ...predictionErrors, "409": jsonResponse("QUESTION_NOT_OPEN, QUESTION_CLOSED, or PRICE_CHANGED; PRICE_CHANGED includes a fresh preview.", { error: { code: "PRICE_CHANGED", message: "The price changed before your prediction was placed." }, preview }) },
      },
    },
    "/api/v1/private/questions/{questionId}/predictions/preview": {
      post: {
        summary: "Preview an A/B prediction", security: cookieSecurity, parameters: [questionId],
        requestBody: requestBody("PredictionPreviewRequest", { answerId: "answer-a", budget: 100 }),
        responses: { "200": jsonResponse("Server-calculated preview.", preview), ...predictionErrors },
      },
    },
    "/api/v1/private/organizer/questions": {
      get: {
        summary: "List owned questions", description: "Requires organizer or administrator role.", security: cookieSecurity,
        responses: { "200": jsonResponse("Owned questions.", { questions: [organizerQuestion] }), ...organizerErrors },
      },
      post: {
        summary: "Create an A/B draft", description: "Requires organizer or administrator role.", security: cookieSecurity,
        requestBody: requestBody("AbQuestionRequest", questionInput),
        responses: { "201": jsonResponse("Draft created.", { question: organizerQuestion }), "400": errors.invalid, ...organizerErrors },
      },
    },
    "/api/v1/private/organizer/categories": {
      post: {
        summary: "Create a category", description: "Requires organizer or administrator role. The new category can be selected while creating a draft.", security: cookieSecurity,
        requestBody: requestBody("CategoryCreateRequest", { name: "Campus" }),
        responses: { "201": jsonResponse("Category created.", { category: { id: "category-1", name: "Campus" } }), "400": errors.invalid, "409": error("Category already exists.", "DUPLICATE_CATEGORY", "A category with this name already exists."), ...organizerErrors },
      },
    },
    "/api/v1/private/organizer/questions/{questionId}": {
      patch: {
        summary: "Update an owned draft", description: "Requires organizer or administrator role.", security: cookieSecurity, parameters: [questionId],
        requestBody: requestBody("AbQuestionRequest", questionInput),
        responses: { "200": jsonResponse("Draft updated.", { question: organizerQuestion }), "400": errors.invalid, ...organizerErrors, "404": errors.notFound, "409": errors.conflict },
      },
    },
    "/api/v1/private/organizer/questions/{questionId}/publish": {
      post: {
        summary: "Publish an owned draft", description: "Requires organizer or administrator role.", security: cookieSecurity, parameters: [questionId],
        responses: { "200": jsonResponse("Published.", { question: { ...questionRecord, status: "OPEN", publishedAt: "2030-01-01T12:00:00.000Z" } }), ...organizerErrors, "404": errors.notFound, "409": errors.conflict },
      },
    },
    "/api/v1/private/organizer/questions/{questionId}/finalize": {
      post: {
        summary: "Close an owned question after its deadline", description: "Requires organizer or administrator role; closing does not resolve or pay out the question.", security: cookieSecurity, parameters: [questionId],
        responses: { "200": jsonResponse("Closed.", { question: { ...questionRecord, status: "CLOSED", publishedAt: "2030-01-01T12:00:00.000Z" } }), ...organizerErrors, "404": errors.notFound, "409": errors.conflict },
      },
    },
    "/api/v1/private/organizer/questions/ready-to-resolve": {
      get: {
        summary: "List owned questions ready for resolution", description: "Requires organizer or administrator role; both deadline and event time must have passed.", security: cookieSecurity,
        responses: { "200": jsonResponse("Eligible questions.", { questions: [{ ...questionRecord, status: "CLOSED", publishedAt: "2030-01-01T12:00:00.000Z", category: { name: "Sports" }, answers: organizerQuestion.answers }] }), ...organizerErrors },
      },
    },
    "/api/v1/private/organizer/questions/{questionId}/resolve": {
      post: {
        summary: "Resolve an owned question and settle predictions", description: "Requires organizer or administrator role; deadline and event time must both have passed.", security: cookieSecurity, parameters: [questionId],
        requestBody: requestBody("ResolveRequest", { answerId: "answer-a", evidenceNote: "Verified final score." }),
        responses: {
          "200": jsonResponse("Resolved.", { question: { ...questionRecord, status: "RESOLVED", publishedAt: "2030-01-01T12:00:00.000Z", correctAnswerId: "answer-a", correctAnswer: { id: "answer-a", text: "Yes" }, resolutionNote: "Verified final score.", resolvedAt: "2030-06-02T12:00:00.000Z" } }),
          "400": errors.invalid, ...organizerErrors, "404": errors.notFound, "409": errors.conflict,
        },
      },
    },
    "/api/v1/private/admin/users": {
      get: {
        summary: "List users", description: "Requires administrator role.", security: cookieSecurity, parameters: [page, search],
        responses: { "200": jsonResponse("Paginated users.", { users: [{ id: "user-1", username: "forecaster", email: "forecaster@example.test", role: "USER", isActive: true }], page: 1, pageSize: 10, total: 1, pageCount: 1 }), ...adminErrors },
      },
    },
    "/api/v1/private/admin/questions": {
      get: {
        summary: "List questions", description: "Requires administrator role.", security: cookieSecurity, parameters: [page, search],
        responses: { "200": jsonResponse("Paginated questions.", { questions: [{ id: "question-1", title: questionInput.title, status: "OPEN", predictionCount: 1 }], page: 1, pageSize: 10, total: 1, pageCount: 1 }), ...adminErrors },
      },
    },
    "/api/v1/private/admin/history": {
      get: {
        summary: "List administrator audit history", description: "Requires administrator role.", security: cookieSecurity, parameters: [page],
        responses: { "200": jsonResponse("Paginated audit entries.", { entries: [{ id: "audit-1", action: "ROLE_CHANGE", targetUserId: "user-1", questionId: null, previousRole: "USER", newRole: "ORGANIZER", amount: null, reason: "Approved", responsibleUserId: "admin-1", createdAt: "2030-01-01T12:00:00.000Z", responsibleUser: { username: "admin" }, targetUser: { username: "forecaster" }, question: null }], page: 1, pageSize: 10, total: 1, pageCount: 1 }), ...adminErrors },
      },
    },
    "/api/v1/private/admin/users/{userId}/role": {
      patch: {
        summary: "Change a user's role", description: "Requires administrator role.", security: cookieSecurity, parameters: [userId],
        requestBody: requestBody("RoleChangeRequest", { role: "ORGANIZER", reason: "Approved organizer" }),
        responses: { "200": jsonResponse("Updated user.", { user: { ...user, role: "ORGANIZER" } }), "400": errors.invalid, ...adminErrors, "404": errors.userNotFound, "409": error("INVALID_ACTION or LAST_ADMINISTRATOR.", "LAST_ADMINISTRATOR", "The last administrator cannot be demoted.") },
      },
    },
    "/api/v1/private/admin/questions/{questionId}/cancel": {
      post: {
        summary: "Cancel a question and refund predictions", description: "Requires administrator role.", security: cookieSecurity, parameters: [questionId],
        requestBody: requestBody("CancellationRequest", { reason: "Event cancelled" }),
        responses: { "200": jsonResponse("Cancelled and refunded.", { status: "CANCELLED", refunded: 100 }), "400": errors.invalid, ...adminErrors, "404": errors.notFound, "409": errors.conflict },
      },
    },
  },
  components: {
    securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" } },
    schemas: {
      RegisterRequest: { type: "object", required: ["username", "email", "password"], properties: { username: { type: "string", minLength: 2, maxLength: 40, pattern: "^[A-Za-z0-9]+$" }, email: { type: "string", format: "email" }, password: { type: "string", format: "password", minLength: 8, description: "Must contain an uppercase letter, a lowercase letter, and a digit; must differ from username and email." } } },
      LoginRequest: { type: "object", required: ["identifier", "password"], properties: { identifier: { type: "string", description: "Username or email." }, password: { type: "string", format: "password" } } },
      AbQuestionRequest: { type: "object", required: ["title", "categoryId", "answerA", "answerB", "deadline", "eventTime", "outcomeCriteria", "source"], properties: { title: { type: "string", maxLength: 200 }, categoryId: { type: "string" }, answerA: { type: "string", maxLength: 40 }, answerB: { type: "string", maxLength: 40 }, startingPriceA: { type: "integer", minimum: 10, maximum: 90, default: 50 }, deadline: { type: "string", format: "date-time", description: "Must not be later than eventTime." }, eventTime: { type: "string", format: "date-time" }, outcomeCriteria: { type: "string", maxLength: 2000 }, source: { type: "string", maxLength: 500 } } },
      CategoryCreateRequest: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1, maxLength: 100 } } },
      PredictionPreviewRequest: { type: "object", required: ["answerId", "budget"], properties: { answerId: { type: "string" }, budget: { type: "integer", minimum: 10 } } },
      PlacePredictionRequest: { type: "object", required: ["answerId", "budget", "minShares", "idempotencyKey"], properties: { answerId: { type: "string" }, budget: { type: "integer", minimum: 10 }, minShares: { type: "integer", minimum: 0, description: "Minimum acceptable shares in hundredths." }, idempotencyKey: { type: "string", minLength: 1, maxLength: 255 } } },
      ResolveRequest: { type: "object", required: ["answerId", "evidenceNote"], properties: { answerId: { type: "string" }, evidenceNote: { type: "string", minLength: 1, maxLength: 2000 } } },
      RoleChangeRequest: { type: "object", required: ["role", "reason"], properties: { role: { type: "string", enum: ["USER", "ORGANIZER", "ADMINISTRATOR"] }, reason: { type: "string", minLength: 1, maxLength: 500 } } },
      CancellationRequest: { type: "object", required: ["reason"], properties: { reason: { type: "string", minLength: 1, maxLength: 500 } } },
    },
  },
};
