# ForecastHub

[![CI](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml/badge.svg)](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml)

ForecastHub is a community prediction platform based on the requirements in [docs/PRD.md](docs/PRD.md). Credits are virtual only. The repository is being built as a TypeScript npm workspace with separate web and API applications.

## Current status

The current release includes:

- Next.js and Tailwind CSS web shell at `apps/web`
- Express API at `apps/api`
- Versioned health endpoint at `/api/v1/public/health`
- Swagger UI at `/api/docs`
- PostgreSQL and Prisma foundation
- Shared Zod contracts in `packages/shared`
- GitHub Actions validation workflow
- Registration, sign-in, sign-out, and secure JWT cookie sessions
- A/B-only release scope with rate-limited authentication routes

Question markets, WebSockets, prediction workflows, and administration are
being delivered against the scoped A/B release issues. Multi-answer questions,
shared pools, scheduled credits, coupon codes, private profiles, balance
history, and prediction history charts are deferred; see
[docs/sprints/sprint-2/descoping.md](docs/sprints/sprint-2/descoping.md).

## Future work

Deferred features remain tracked in the PRD and GitHub issues. The Prisma schema
retains dormant multi-answer and ledger structures so future work does not
require a risky course-timeline migration. Known dependency audit findings are
documented in [issue #32](https://github.com/chenx16/cs6983-p2-team10/issues/32).

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer (npm 6 does not support npm workspaces)
- Docker Desktop, for local PostgreSQL

Check the toolchain with:

```bash
node --version
npm --version
```

With `nvm`, the setup is:

```bash
nvm install 20
nvm use 20
npm install --global npm@10
```

## Local development

From the repository root:

```bash
cp .env.example apps/api/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run dev
```

The API starts on `http://localhost:4000`. The web app starts on
`http://localhost:3000`. The web app forwards `/api/*` requests to the API
using `API_URL`, which defaults to `http://localhost:4000` for local
development. OpenAPI documentation is available at
`http://localhost:4000/api/docs`.

The API currently requires a `JWT_SECRET` of at least 32 characters. The example environment file contains a local development value; use a separately generated secret outside local development.

Set `NEXT_PUBLIC_API_URL` to the API base URL for the web app. It defaults to
`http://localhost:4000` locally, and the API docs link uses
`${NEXT_PUBLIC_API_URL}/api/docs/` directly so Swagger's trailing slash is
preserved. For the deployed Vercel web app, set both `NEXT_PUBLIC_API_URL` and
`API_URL` to the deployed Render API URL.
The Swagger UI uses a relative API server URL, so its “Try it out” requests
work against whichever API host serves the documentation.
The web development and build scripts compile the shared API contracts first;
after changing shared contracts during development, rebuild that workspace.

## Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
```

API integration tests use the separate local PostgreSQL database
`forecasthub_test`, configured in `apps/api/.env.test`. Create that ignored
file from the safe local template, then apply the existing Prisma migrations:

```bash
cp apps/api/.env.test.example apps/api/.env.test
set -a && source apps/api/.env.test && set +a
DATABASE_URL="$DATABASE_URL_TEST" npm exec --workspace=@forecasthub/api -- prisma migrate deploy
```

The development database is not used or cleared by tests. Test cleanup refuses
to run unless the configured database is local/CI test infrastructure and its
name ends in `_test`.

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Administrator actions require an authenticated Administrator session:

```text
GET   /api/v1/private/admin/users?page=1&search=
GET   /api/v1/private/admin/questions?page=1&search=
GET   /api/v1/private/admin/history?page=1
PATCH /api/v1/private/admin/users/:userId/role
POST  /api/v1/private/admin/questions/:questionId/cancel
```

Authenticated users can review their own prediction history:

```text
GET   /api/v1/private/predictions
```

The response is private to the signed-in user and includes the question,
selected answer, credits charged, shares, Pacific-time prediction timestamp,
and a timestamp displayed in Pacific Time, plus pending, won, lost, or
refunded settlement status. It never exposes
another user's predictions.

Public question pages also support WebSocket price updates:

```text
WS    /api/v1/public/questions/:questionId/stream
```

Messages contain the question ID, market version, aggregate A/B prices, and
credits spent by answer. They never include user identity or private balance
data. The browser reconnects and reloads the latest question data after a
disconnect. Private balance, payout, notice updates, and crowd history charts
are intentionally out of scope.

User and question lists are paginated and searchable so the UI does not load
all records at once. Administrators can use the history endpoint to review
immutable role-change, cancellation, and refund records. Role changes require a
target role and reason. Question cancellation requires a reason; each original
prediction charge is refunded in a transaction, and role changes, cancellation,
and refund records retain the responsible account and reason for auditability.
The last active Administrator cannot be demoted.

Organizer question tools are available to Organizers and Administrators:

```text
GET   /api/v1/public/categories
GET   /api/v1/private/organizer/questions
POST  /api/v1/private/organizer/questions
PATCH /api/v1/private/organizer/questions/:questionId
POST  /api/v1/private/organizer/questions/:questionId/publish
POST  /api/v1/private/organizer/questions/:questionId/finalize
```

The Organizer workspace is available at `/organizer` and from the authenticated
navigation. It supports creating and editing owned drafts, publishing valid A/B
questions, and closing an open question after its deadline. Finalization closes
the question; selecting a correct answer and issuing payouts are separate
resolution workflows.

The Organizer workspace is divided into three tabs:

- **My Questions** lists questions created by the signed-in Organizer.
- **Edit Drafts** contains the new-draft form and editable draft questions.
- **Resolve** lists eligible questions after their deadlines and provides the
  answer selector and evidence-note form for resolution.

The public Arena loads `GET /api/v1/public/questions`. By default it returns
visible, published A/B questions that are open and not past their deadline,
ordered by the soonest deadline. Repeat the `category` query parameter to
filter by category IDs, and use `status=OPEN`, `CLOSING_SOON`, `CLOSED`,
`RESOLVED`, or `CANCELLED`. Closing soon means a future deadline within 24
hours; closed includes open questions whose deadline has passed. The optional
`type` filter accepts `AB` or `MULTI_ANSWER`, but multi-answer questions are
outside the current release and return an empty list. Hidden and draft
questions are never included.

Organizers and Administrators can resolve eligible A/B questions:

```text
GET  /api/v1/private/organizer/questions/ready-to-resolve
POST /api/v1/private/organizer/questions/:questionId/resolve
```

Resolution requires an answer and evidence note. The server locks the question,
marks it resolved, pays each winning prediction `shares × 100` credits, and
writes payout ledger entries in the same transaction. Questions with no winning
predictions refund their original charges. A question cannot be resolved twice.

## Environments

ForecastHub uses separate local, preview, and production environments:

- **Local:** Copy `.env.example` to `apps/api/.env`. Use the Docker Compose
  PostgreSQL database and localhost URLs. Local secrets stay in ignored `.env`
  files and are never committed.
- **Preview:** Pull requests use Vercel Preview deployments. Configure
  `API_URL` and `NEXT_PUBLIC_API_URL` in Vercel's Preview environment
  variables. Preview deployments use the shared deployed API; backend
  variables are configured on Render and are not needed by the web preview.
  Do not put preview secrets in GitHub or the repository.
- **Production:** The `production` GitHub environment is used by both deploy
  jobs after validation succeeds. Store `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, and `RENDER_DEPLOY_HOOK_URL` as repository secrets in
  GitHub. Store application values such as `DATABASE_URL`, `JWT_SECRET`,
  `WEB_ORIGIN`, and `API_URL` in the Vercel and Render production environment
  settings.

## CI and deployment

Every pull request runs install, typecheck, lint, test, and build checks. A
successful merge to `main` deploys the web app to Vercel and triggers the API
deployment on Render. Pull requests also run `npm audit --audit-level=high`
and CodeQL analysis.

Configure these GitHub Actions repository secrets before merging to `main`:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` for the web app.
- `RENDER_DEPLOY_HOOK_URL` for the API service.

The deployment workflow reads these values only from GitHub repository secrets.
Do not commit provider tokens, project identifiers that are secret, deploy
hooks, or application environment values to the repository.

## Known limitations

The public question-detail IP limit and pre-authentication IP limit on
prediction routes are safety nets, each defaulting to 600 requests per minute.
They can be configured with `PUBLIC_QUESTION_DETAIL_RATE_LIMIT` and
`PREDICTION_PREAUTH_RATE_LIMIT`. Behind Vercel and Render proxies, multiple
users may share the same apparent IP address, so these limits are deliberately
generous. Accurate IP-based rate limiting depends on a safe `trust proxy`
configuration tracked in [issue #16](https://github.com/chenx16/cs6983-p2-team10/issues/16).

## Known security issues

The high-severity audit findings currently come from Prisma's
`deepmerge-ts` dependency and Next.js's PostCSS dependency. The available
automated fixes require major-version upgrades, so they are tracked separately
in [issue #32](https://github.com/chenx16/cs6983-p2-team10/issues/32).
The CI audit step reports these findings without blocking the pipeline, while a
separate critical-severity production dependency audit remains blocking.

## Repository layout

```text
apps/web       Next.js frontend
apps/api       Express API and Prisma schema
packages/shared Shared DTOs and validation schemas
docs           Product requirements and mockup reference
```

The prototype in `docs/design` is a visual reference only. Its demo credentials, simulated persistence, and browser-side accounting must not be copied into production behavior.