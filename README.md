# ForecastHub

[![CI](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml/badge.svg)](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml)

ForecastHub is a community prediction market where people use **virtual
credits**, not money, to predict outcomes of A/B questions. Participants can
follow changing crowd prices, while organizers resolve questions and
administrators oversee the platform.

## Links

- [Production app](https://cs6983-p2-team10.vercel.app/)
- [API documentation (Swagger)](https://cs6983-p2-team10-api.onrender.com/api/docs/)
- Demo video: link to be added
- [Architecture and CI/CD diagrams](docs/ARCHITECTURE.md)
- [Database schema](docs/SCHEMA.md)

Graders: for Organizer or Administrator demo access, please contact the project
team privately through Canvas. Do not post credentials in this public repository.

## Project evidence

| Rubric area | Where to find the evidence |
|---|---|
| Functionality | [Features](#features), [production app](https://cs6983-p2-team10.vercel.app/), and [API documentation](https://cs6983-p2-team10-api.onrender.com/api/docs/) |
| Technical excellence | [Architecture](#architecture), [database schema](docs/SCHEMA.md), and [testing and TDD](#testing) |
| AI mastery | [AI-assisted development](#ai-assisted-development), [shared rules](AGENTS.md), and [context engineering reflection](docs/reflections/hw3-context-engineering.md) |
| CI/CD and DevOps | [CI/CD](#cicd), [environment setup](#environments), and [workflow](.github/workflows/ci.yml) |
| Agile and pair workflow | [Sprint and collaboration records](#agile-and-collaboration) and [contribution log](docs/CONTRIBUTIONS.md) |
| Documentation | [Architecture and schema](#architecture), [API](#api), sprint records, and [individual reflections](#agile-and-collaboration) |

## Features

- **Visitor:** Browse and filter the Arena, view question details and live
  prices, and explore the public leaderboard.
- **User:** Register or sign in, preview and place predictions with virtual
  credits, check the balance, and view personal prediction history.
- **Organizer:** Create, edit, publish, and close A/B questions; resolve eligible
  questions after their deadline and event time using an answer and evidence.
  Organizers can also create a category from the draft form.
- **Administrator:** Use organizer tools, manage user roles, cancel questions
  with refunds, and review administrative history.

Public prices update over WebSockets; the API handles permissions, predictions,
credits, and payouts. Features deferred from this release are listed in the
[Sprint 2 descoping decisions](docs/sprints/sprint-2/descoping.md). Category
creation was subsequently added in
[PR #88](https://github.com/chenx16/cs6983-p2-team10/pull/88).

## Tech stack

| Area | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Authentication | JWT in an HttpOnly cookie |
| Contracts and API docs | Zod, OpenAPI, Swagger UI |
| Testing | Vitest, Supertest, Playwright |
| Hosting and CI | Vercel, Render, Neon, GitHub Actions |

## Architecture

```mermaid
flowchart LR
    Browser["Browser"]
    Vercel["Vercel: Next.js web app<br/>/api rewrite"]
    Render["Render: Express API<br/>and WebSocket server"]
    Neon["Neon: PostgreSQL"]

    Browser -->|"Pages and /api requests"| Vercel
    Vercel -->|"/api/* rewrite"| Render
    Browser -->|"WebSocket price updates"| Render
    Render -->|"Prisma reads and transactions"| Neon
```

See [architecture and CI/CD](docs/ARCHITECTURE.md) for details and the deployment
flow, and [schema](docs/SCHEMA.md) for the data model.

## Local development

Prerequisites: Node.js 22.x, npm 10 or newer, and Docker Desktop for PostgreSQL.
Check with `node --version` and `npm --version`; with nvm, run
`nvm install 22` and `nvm use 22`.

From the repository root:

```bash
cp .env.example apps/api/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

The web app runs at `http://localhost:3000`, the API at
`http://localhost:4000`, and local Swagger at
`http://localhost:4000/api/docs/`. The web app forwards `/api/*` to `API_URL`,
which defaults to the local API. `NEXT_PUBLIC_API_URL` also defaults to the
local API and is used for the API docs link and WebSocket connections.
The API requires a `JWT_SECRET` of at least 32 characters; use a separately
generated secret outside local development.

The web development and build scripts build the shared contracts first. After
changing shared contracts during development, rebuild that workspace.

For **local development only**, `npm run db:seed` adds example categories,
questions, and demo users. **Never run it against production or a public
database:** it creates demo accounts, including an Organizer, with a publicly
known password. Do not use the example secret outside local development.

## Testing

Vitest covers shared logic and web components; Supertest and API integration
tests exercise HTTP behavior and database-backed workflows. Integration tests
use a **separate, disposable PostgreSQL test database** and clear its data.
The reset guard accepts only the local/CI hosts `localhost`, `127.0.0.1`, or
`postgres`, with a database name ending in `_test`. Never use a shared,
persistent, development, or production database for tests.

After starting the local PostgreSQL service, create the dedicated database if
it does not already exist and apply its migrations:

```bash
cp apps/api/.env.test.example apps/api/.env.test
# Only if forecasthub_test does not already exist:
docker compose exec postgres createdb -U forecasthub forecasthub_test
set -a && source apps/api/.env.test && set +a
DATABASE_URL="$DATABASE_URL_TEST" npm exec --workspace=@forecasthub/api -- prisma migrate deploy
```

Then run from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
```

`typecheck` builds the shared workspace before the tests. The smoke check
imports the built shared package and constructs the API with native Node.js.

### Browser E2E

Playwright covers three browser journeys:

1. Register, browse the Arena, preview and place a prediction, and check the
   balance and prediction history.
2. Sign in as an Organizer, create a category, create and publish an A/B
   question in that category, and find it in the Arena.
3. Resolve an eligible question and check the seeded participant's updated
   leaderboard result.

The resolution test uses a seeded participant with previous results; it is a
separate test from the newly registered user's prediction journey. These tests
add coverage for existing behavior rather than claiming a failing business
regression test.

The test **clears all tables** in its dedicated `forecasthub_e2e_test` database
before every run. Its guard accepts only `localhost` or `127.0.0.1` with that
exact database name; `DATABASE_URL` is not a fallback for `E2E_DATABASE_URL`.
The seed creates test-only accounts with a known password. Never point it at a
shared or public database. Use a separate checkout if a Next.js development
server is running, because the test builds the web app and replaces that
checkout's `.next` output.

For example, with Docker running, port 55432 free, and no existing container
named `forecasthub-e2e`:

```bash
docker run --name forecasthub-e2e --rm -d -p 127.0.0.1:55432:5432 \
  -e POSTGRES_DB=forecasthub_e2e_test -e POSTGRES_USER=e2e \
  -e POSTGRES_PASSWORD=e2e postgres:17-alpine
export E2E_DATABASE_URL='postgresql://e2e:e2e@127.0.0.1:55432/forecasthub_e2e_test?schema=public'
DATABASE_URL="$E2E_DATABASE_URL" npm run db:generate
DATABASE_URL="$E2E_DATABASE_URL" npm exec --workspace=@forecasthub/api -- prisma migrate deploy
npm run build --workspace=@forecasthub/api
npx playwright install chromium
npm run test:e2e
docker stop forecasthub-e2e
unset E2E_DATABASE_URL
```

Only continue if the container starts successfully, and wait for PostgreSQL to
be ready before running migrations. Stop only the container created for this
test. Playwright starts its own API and web servers on ports 43017 and 43018
and refuses to reuse existing servers.

### Test-driven development

For business-critical changes, the project aims to commit failing tests before
the implementation. Examples include the regression fixes in
[PR #74](https://github.com/chenx16/cs6983-p2-team10/pull/74),
[#75](https://github.com/chenx16/cs6983-p2-team10/pull/75),
[#76](https://github.com/chenx16/cs6983-p2-team10/pull/76), and
[#77](https://github.com/chenx16/cs6983-p2-team10/pull/77), as well as the
OpenAPI coverage tests in
[PR #79](https://github.com/chenx16/cs6983-p2-team10/pull/79).
Each PR records the test and fix commits.

For a concrete red-to-green example, PR #74 first committed a
[test for malformed WebSocket upgrades](https://github.com/chenx16/cs6983-p2-team10/commit/634422d04cbcc7502bc353bc3b5ca3add0383540),
then committed the
[fix](https://github.com/chenx16/cs6983-p2-team10/commit/3c705320b2c0a9f8da82a04775da5fddd0432266).
For documentation coverage, PR #79 similarly committed the
[route coverage test](https://github.com/chenx16/cs6983-p2-team10/commit/2a2511108a24c690e23df1c44921157dcf653870)
before the [OpenAPI definitions](https://github.com/chenx16/cs6983-p2-team10/commit/fbe9944d4caf6343b6e4969c81e922c75d8798ad).
These examples show the test-first sequence for those changes, not a claim that
every feature followed it.

## AI-assisted development

[AGENTS.md](AGENTS.md) gives contributors and coding agents shared context:
product constraints, server-side accounting and authorization rules, testing,
and Git workflow. The team refines these instructions when experience reveals
missing or unclear guidance. The [HW3 context engineering reflection](docs/reflections/hw3-context-engineering.md)
describes the before/after comparison and resulting rules.

In that comparison, both runs missed database migrations and wrote tests after
the code, even though the run with rules followed the PRD more closely. The
team responded by adding explicit Prisma, migration, and test-first rules. This
illustrates why project context and human verification both matter.

For AI-assisted TDD, the intended workflow is to review the requirements,
have the assistant write a focused failing test, inspect and confirm the test,
commit it, then implement the fix and rerun validation. Humans review changes
and confirm commits and pushes. AI-generated output is checked against the
code, tests, and PR review rather than accepted without verification.

For example, [PR #56](https://github.com/chenx16/cs6983-p2-team10/pull/56)
added a native Node smoke check after an ESM import failure, and
[PR #73](https://github.com/chenx16/cs6983-p2-team10/pull/73) addressed
shared-IP authentication lockouts with regression tests.

## API

The complete HTTP and WebSocket reference, including authentication and role
requirements, is available in [Swagger](https://cs6983-p2-team10-api.onrender.com/api/docs/).
See [API notes](docs/API.md) for a concise overview of the retained workflows.

## CI/CD

On each PR, GitHub Actions installs dependencies, migrates a PostgreSQL test
database, and runs typecheck, lint, unit/integration tests, build, and the smoke
check. It reports high-severity `npm audit` findings without blocking and
blocks on critical production-dependency findings. CodeQL runs in a separate
workflow, and Vercel provides a preview deployment.

An independent E2E job runs Playwright against its own PostgreSQL service and
uploads screenshots and traces on failure. On a push to `main`, both validation
and E2E must pass before triggering web deployment to Vercel and the Render API
deployment hook, subject to the configured production environment and secrets.

## Agile and collaboration

- [Sprint milestones](https://github.com/chenx16/cs6983-p2-team10/milestones?state=all)
- [ForecastHub project board](https://github.com/users/chenx16/projects/1)
- [Sprint 1 planning](docs/sprints/sprint-1/planning.md),
  [standups](docs/sprints/sprint-1/standups.md), and
  [retrospective](docs/sprints/sprint-1/retrospective.md)
- [Sprint 2 decisions](docs/sprints/sprint-2/descoping.md),
  [standups](docs/sprints/sprint-2/standups.md), and
  [retrospective](docs/sprints/sprint-2/retrospective.md)
- [Sprint meeting notes](docs/sprints/)
- [Partner contributions](docs/CONTRIBUTIONS.md)
- Project 2 individual reflections:
  [Xinlai](docs/reflections/project-2-xinlai-chen.md) and
  [Qiong](docs/reflections/project-2-qiong-wu.md)

Sprint records describe joint planning, decisions, standups, and retrospectives.
The contribution log distinguishes issue assignments from completed work.
Each partner submits their own Project 2 reflection separately.

## Environments

- **Local:** Copy `.env.example` to `apps/api/.env`. Use Docker Compose
  PostgreSQL and localhost URLs. Local secrets stay in ignored `.env` files.
- **Preview:** PRs use Vercel Preview deployments. Set `API_URL` and
  `NEXT_PUBLIC_API_URL` in Vercel's Preview environment. Previews currently
  use the shared deployed API, not an isolated preview database.
- **Production:** Both deploy jobs use the GitHub `production` environment
  after validation. Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, and `RENDER_DEPLOY_HOOK_URL` as GitHub secrets. Keep
  application values such as `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, and
  `API_URL` in the relevant Vercel and Render environment settings. Set both
  `API_URL` and `NEXT_PUBLIC_API_URL` to the Render API URL in Vercel.

Do not commit provider tokens, deploy hooks, credentials, or environment
values. Swagger uses a relative API server URL, so its “Try it out” requests
target the API host serving the documentation.

## Known limitations

The public question-list, question-detail, and leaderboard routes share an IP
limit; the pre-authentication IP limit on prediction routes is a separate safety
net. Each defaults to 600 requests per minute and can be configured with
`PUBLIC_QUESTION_DETAIL_RATE_LIMIT` and
`PREDICTION_PREAUTH_RATE_LIMIT`. Behind Vercel and Render proxies, multiple
users may share the same apparent IP address, so these limits are deliberately
generous. Accurate IP-based rate limiting depends on a safe `trust proxy`
configuration tracked in [issue #16](https://github.com/chenx16/cs6983-p2-team10/issues/16).

Login limits failed attempts to 10 per submitted identifier and 300 per apparent
IP address in 15 minutes; successful logins do not consume those limits.
Registration has a separate limit of 10 requests per apparent IP address in
15 minutes. Session checks, logout, and several private routes share a limit of
600 requests per apparent IP address in 15 minutes. Username and email are
separate login identifiers, and proxy sharing can still cause the IP limits to
affect multiple users.

## Known security issues

The high-severity audit findings currently come from Prisma's
`deepmerge-ts` dependency and Next.js's PostCSS dependency. The available
automated fixes require major-version upgrades, so they are tracked separately
in [issue #32](https://github.com/chenx16/cs6983-p2-team10/issues/32).
The CI audit step reports these findings without blocking the pipeline, while a
separate critical-severity production dependency audit remains blocking.

## Repository layout

```text
apps/web         Next.js frontend
apps/api         Express API and Prisma schema
packages/shared  Shared DTOs and validation schemas
docs             Requirements, architecture, schema, and sprint documentation
e2e/             Playwright browser tests
```

The prototype in `docs/design` is a visual reference only. Its demo credentials,
simulated persistence, and browser-side accounting must not be copied into
production behavior.
