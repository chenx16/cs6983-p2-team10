---
trigger: always_on
---

# ForecastHub Agent and Contributor Guide

This file is the repository-level guide for coding agents and contributors. Follow
the product requirements in [docs/PRD.md](docs/PRD.md) before making behavioral
decisions. If the code and the PRD disagree, preserve the core rules in the PRD
and call out the discrepancy in the pull request.

## Core principles

1. **Production quality:** Write readable, type-safe, maintainable code that
   preserves the repository's existing patterns.
2. **Premium product UI:** Follow [DESIGN.md](./DESIGN.md) and the Arena
   reference for polished Next.js and TailwindCSS interfaces. Avoid generic
   default styling.
3. **Test-driven delivery:** No feature is complete until its relevant
   automated checks pass. Add focused tests for new behavior before changing
   business-critical logic.
4. **Server authority:** Keep authentication, authorization, accounting,
   prediction, payout, correction, and moderation decisions on the server.
5. **Scrum collaboration:** Track feature work through GitHub Issues, focused
   branches, pull requests, and reviewable commits.

## Agent workflow rules

- Verify that a corresponding GitHub Issue exists or is conceptually tracked
  before implementing a feature. Reference it in the pull request and commit
  when applicable.
- Inspect the relevant code, PRD requirements, design references, and tests
  before editing.
- Use the smallest relevant validation command during development, then run
  the complete required checks before reporting completion.
- State uncertainty and evidence explicitly. Do not invent API behavior,
  product requirements, test results, or dependency support.
- Make frequent focused commits at completed feature or sub-component
  checkpoints; never commit secrets, credentials, generated data, or unrelated
  changes.

## Project context

ForecastHub is a community prediction platform. Users make predictions with
virtual credits, follow changing crowd predictions, and compare forecasting
results. Credits are never money, cannot be purchased or transferred, and must
not be implemented as gambling or a cash-equivalent balance.

### Tech stack

The project standard is to use the latest stable release of every supported
tool and dependency. Verify the current stable release before adding or
upgrading a tool, update the relevant manifest and lockfile, and run the full
validation suite. The categories below describe the current repository stack.

- **Frontend Framework:** Next.js (React) with TypeScript
- **Styling:** TailwindCSS (premium, professional design; see [DESIGN.md](./DESIGN.md))
- **API Backend:** Express
- **Database Backend:** PostgreSQL + Prisma
- **Validation and Contracts:** Zod
- **Authentication:** JWT
- **API Documentation:** Swagger UI Express
- **Testing:** Vitest and Supertest
- **Local Infrastructure:** Docker Compose for PostgreSQL
- **CI/CD:** GitHub Actions

Keep all tools on their latest stable versions unless a documented
compatibility or security constraint requires otherwise. Record any temporary
version exception in the pull request. Do not claim a deployment provider or
machine-learning dependency until it is added to the repository and validated.

### Architecture and folder structure

```text
ForecastHub/
  AGENTS.md            shared rules read by every IDE and coding agent
  DESIGN.md            UI tokens, visual rules, and accessibility requirements
  README.md            setup, development, and validation commands
  .env.example         variable names only; never commit secret values
  .github/
    workflows/         CI/CD workflows
    ISSUE_TEMPLATE/    issue and pull request templates
  docs/
    PRD.md             product requirements and acceptance criteria
    design/            visual prototype references
    api/               OpenAPI specifications
    architecture.md    architecture decisions and diagrams
    decisions/         one record per major technical choice
    sprints/            sprint planning, standups, and retrospectives
  apps/
    web/               Next.js App Router frontend
      app/             routes, layouts, pages, and global styles
    api/               Express backend
      src/             app construction and server startup
      prisma/          schema and seed data
  packages/
    shared/            shared TypeScript/Zod contracts
  tests/               cross-workspace and integration tests
  e2e/                 browser end-to-end tests
```

This repository currently has `apps/`, `packages/`, `docs/PRD.md`,
`docs/design/`, `.github/workflows/`, and the root `AGENTS.md`, `DESIGN.md`,
`README.md`, and `.env.example`. The remaining scoped-rule, research, API
documentation, architecture, decision, sprint, test, and E2E directories are
reserved for the corresponding work as those artifacts are added. Keep this
layout rather than collapsing the separate web and API applications into a
single `src/` directory.

The web and API are separate applications. The API is the source of truth for
authentication, permissions, market calculations, credit balances, predictions,
payouts, corrections, and moderation. The browser may display server results
and request previews, but it must never be trusted to calculate or authorize
financial-like operations.

Use the shared package for request/response contracts and validation schemas
used by more than one workspace. Keep API-only database and authorization
logic in `apps/api`; keep presentation and interaction logic in `apps/web`.
Use explicit service boundaries as the API grows rather than duplicating
accounting rules in route handlers and UI components.

## Coding standards

- Use strict TypeScript and preserve the existing compiler settings.
- Prefer small, named functions with explicit inputs and outputs.
- Use `camelCase` for variables and functions, `PascalCase` for React
  components, classes, and types, and `UPPER_SNAKE_CASE` only for true
  constants.
- Use descriptive file names; keep route, service, schema, and test names
  aligned with the feature they implement.
- Use single-purpose modules and existing helpers before adding new utilities.
- Validate all external input at the API boundary with Zod or an equivalent
  existing schema.
- Return explicit errors using the API's established error shape. Do not catch
  broad exceptions, silently default invalid data, or return success-shaped
  fallbacks.
- Keep comments rare and explain only non-obvious decisions.
- Format changes consistently with the surrounding file and run the relevant
  type checks and tests before submission.

### Data and accounting invariants

- Use database transactions for operations that change balances, predictions,
  payouts, corrections, or moderation state.
- Record credit activity as append-only ledger entries.
- Never mutate or delete an original prediction or ledger transaction.
- Keep original prediction timestamps, charged credits, prices, and pool totals.
- Keep all deadlines, displayed times, and scheduled weekly credits explicitly
  in Pacific Time; do not add a user-configurable time zone.
- Add focused tests before changing LMSR arithmetic, pool payouts, permissions,
  or correction behavior.
- Keep the LMSR liquidity parameter, share precision, charge ceiling, payout
  rules, and display-price limits exactly as specified in the PRD.

## PRD and design references

### Product requirements

[docs/PRD.md](docs/PRD.md) is the source of truth for roles, user stories,
acceptance criteria, accounting rules, APIs, moderation, corrections, and
non-goals. In particular, preserve these rules:

- Public browsing works without sign-in; predictions and private information
  require authentication.
- A/B questions use LMSR with a liquidity parameter of 500 credits.
- Multi-answer questions use a shared pool.
- Deadlines reject new predictions after the deadline.
- Corrections and refunds add adjustment records without rewriting history.
- Public responses must not expose emails, balances, private predictions, or
  identifying information about individual predictions.

### Prototype and visual design

UI work follows the repository design system in
[DESIGN.md](./DESIGN.md). Use the design document's tokens, layout rules,
component behavior, accessibility requirements, and implementation checklist.

The visual reference is [docs/design/ForecastHub – The Arena.md](docs/design/ForecastHub%20%E2%80%93%20The%20Arena.md)
and its corresponding HTML artifact. It describes the Arena dashboard,
question detail, prediction, and sign-in surfaces. It is a design reference,
not an implementation or persistence layer. Prototype demo credentials,
simulated persistence, and browser-side accounting must never be copied into
production behavior.

### Key UI surfaces

- **The Arena:** List questions by category and status. Each item shows the
  title, category, Pacific Time deadline, total credits spent, and either A/B
  prices or the leading multi-answer pool shares. Support filtering and clear
  status/deadline presentation.
- **Question detail:** Show the question, criteria, trusted source, deadline,
  answer choices, current prices or pool totals, prediction history/chart, and
  the signed-in user's prediction controls. Refresh public values through the
  documented live-update mechanism without exposing who made a prediction.
- **Prediction control:** Require sign-in, show a server-generated preview
  before confirmation, display the actual charge and resulting prices/shares,
  reject invalid amounts and closed questions, and make the immutable nature of
  a submitted prediction clear.
- **Sign-in and registration:** Keep authentication entry points visible.
  Redirect unauthenticated users who attempt a private action to sign-in.
  Store and remove tokens according to the API's authentication contract; never
  log credentials or tokens.
- **Profile and results:** Show the signed-in user's balance, transactions,
  predictions, payouts, and notices only through private API responses.
- **Leaderboard:** Publicly show rank, username, scored questions, and success
  rate. Do not show balances or net gain.
- **Organizer/admin surfaces:** Gate every action on the server. Resolution,
  correction, refund, user removal, and moderation actions must be auditable
  and must not rewrite historical records.
- **API documentation:** Keep OpenAPI/Swagger documentation synchronized with
  public/private endpoints and documented WebSocket messages.

### User flows

1. A visitor opens the Arena, browses filters, and views a question without
   signing in.
2. The visitor selects an answer or prediction action. If authentication is
   required, the app sends them to sign in or register, then returns them to
   the intended question.
3. A signed-in user chooses an answer and budget. The client requests a
   server preview, presents the charge/shares/prices/payout, and submits only
   after confirmation.
4. The server validates identity, permissions, deadline, balance, and
   accounting rules inside a transaction. The UI displays the immutable
   confirmation and live crowd update.
5. After resolution, the organizer uses the stated criteria and source. The
   server records payouts or adjustments, updates private notices and the
   leaderboard, and retains the original history.
6. A visitor can inspect the public leaderboard; a signed-in user can inspect
   private results and balance history. No flow reveals another user's private
   data.

## Testing strategy

Vitest is the test framework. Shared and API tests run with `vitest run`;
Supertest is used for API HTTP behavior. The web workspace currently has a
smoke-test placeholder, so UI changes also require manual browser verification
with `npm start`/the configured app start commands.

Follow these patterns:

- Put focused tests beside the implementation as `*.test.ts` or
  `*.test.tsx`.
- Test public behavior and observable responses, not implementation details.
- Cover happy paths, validation failures, authorization failures, deadline
  boundaries, insufficient balances, duplicate actions, and correction paths.
- Use deterministic fixtures and isolated test data; never use real credentials,
  production databases, or persistent user data.
- For accounting, assert exact charges, shares, balances, ledger entries, and
  immutability.
- For UI, verify keyboard interaction, loading/error/empty states, responsive
  behavior, and server error handling.

There is no repository-wide coverage threshold configured yet. Treat coverage
as a quality goal: new business-critical code should have focused branch
coverage, and changes to accounting, permissions, or corrections should not
lower meaningful existing coverage. Add coverage tooling and a threshold only
as an intentional, reviewed repository change.

Run validation from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For local development:

```bash
cp .env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
npm install
docker compose up -d postgres
npm run db:generate
npm run dev
```

## Scrum and GitHub workflow

### Branches

Use short, lowercase, kebab-case branches:

```text
feature/42-add-question-preview
fix/57-reject-late-predictions
docs/61-update-contributor-guide
chore/64-upgrade-vitest
```

Use the issue number when one exists. Do not work directly on `main` except
for explicitly approved administrative changes.

### Commits

Use imperative, concise Conventional Commit-style messages:

```text
feat(api): add prediction preview
fix(accounting): preserve correction ledger entries
test(api): cover closed-question validation
docs: update Arena flow
chore(deps): update Prisma
```

Keep commits focused and buildable. Include the issue reference when relevant,
for example `feature/42-user-login`. Do not put secrets,
tokens, generated credentials, or unrelated formatting churn in commits.

### Pull requests

- Open a PR from the feature branch into `main`.
- Link the GitHub Issue in the PR description using `Closes #42` when the PR
  fully resolves it, or `Refs #42` when it is related but incomplete.
- Summarize behavior changes, migration needs, security implications, and
  verification commands.
- Include screenshots or a short recording for UI changes.
- Request at least one reviewer; request an API/data reviewer for accounting,
  permissions, authentication, migrations, or moderation changes.
- Do not merge until required checks pass, review comments are resolved, and
  the branch is up to date with `main`.
- Never include secrets or private user data in issue descriptions, commits,
  logs, screenshots, or PR comments.

In source comments, use an issue reference only when it explains a durable
product or technical decision, such as `See #42 for the resolution policy`.
Prefer linking the PR/issue in the PR description over adding issue noise to
production code.

## Do's and don'ts

### Do

- Reuse shared Zod contracts and existing API helpers.
- Prefer Prisma transactions and append-only ledger records.
- Keep authorization and accounting checks on the server.
- Use environment variables for secrets and validate them at startup.
- Return least-privilege, privacy-preserving public data.
- Use semantic HTML, labels, keyboard-accessible controls, visible focus
  states, sufficient color contrast, and useful error messages.
- Include accessible names and status announcements for prediction results,
  validation errors, live price updates, and loading states.
- Test Pacific Time boundaries and daylight-saving transitions explicitly.
- Update directly related documentation and OpenAPI descriptions with behavior
  changes.

### Don't

- Do not trust browser-supplied prices, balances, roles, permissions, or payout
  amounts.
- Do not mutate/delete historical predictions or ledger entries.
- Do not use floating-point shortcuts for credit/accounting rules where the PRD
  requires exact precision and rounding.
- Do not expose JWTs, passwords, emails, private predictions, balance histories,
  or internal errors in public responses or logs.
- Do not add real-money features, transfers, betting language, or purchasable
  credits.
- Do not copy prototype demo authentication, simulated persistence, or
  client-side accounting.
- Do not add dependencies when an existing platform or repository helper is
  sufficient. Prefer the existing stack: Next.js/React, Express, Prisma,
  Zod, Vitest, Supertest, and Tailwind.
- Do not disable TypeScript checks, lint rules, authentication, CSRF/CORS
  protections, or accessibility behavior to make a test or build pass.
- Do not commit `.env` files, generated secrets, database dumps, build output,
  or personal data.

## Evidence and communication

- Prefer evidence from the repository, PRD, tests, and documented tool output
  over assumptions.
- Say when a requested behavior is not implemented or when confidence is low;
  do not present fixture data as production persistence.
- Keep user-facing updates concise and include the files changed and checks
  actually run.
