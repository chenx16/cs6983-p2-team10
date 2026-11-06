# ForecastHub

[![CI](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml/badge.svg)](https://github.com/chenx16/cs6983-p2-team10/actions/workflows/ci.yml)

ForecastHub is a community prediction platform based on the requirements in [docs/PRD.md](docs/PRD.md). Credits are virtual only. The repository is being built as a TypeScript npm workspace with separate web and API applications.

## Current status

The initial scaffold includes:

- Next.js and Tailwind CSS web shell at `apps/web`
- Express API at `apps/api`
- Versioned health endpoint at `/api/v1/public/health`
- Swagger UI at `/api/docs`
- PostgreSQL and Prisma foundation
- Shared Zod contracts in `packages/shared`
- GitHub Actions validation workflow

Market accounting, authentication flows, WebSockets, scheduled credits, prediction workflows, and administration are intentionally not implemented yet.

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

## Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Environments

ForecastHub uses separate local, preview, and production environments:

- **Local:** Copy `.env.example` to `apps/api/.env`. Use the Docker Compose
  PostgreSQL database and localhost URLs. Local secrets stay in ignored `.env`
  files and are never committed.
- **Preview:** Pull requests use Vercel Preview deployments. Configure
  `API_URL`, `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `JWT_SECRET`, and
  `WEB_ORIGIN` in the hosting provider's preview environment variables; do not
  put preview secrets in GitHub or the repository.
- **Production:** The `production` GitHub environment is used by both deploy
  jobs after validation succeeds. Store `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, and `RENDER_DEPLOY_HOOK_URL` as production environment
  secrets in GitHub. Store application values such as `DATABASE_URL`,
  `JWT_SECRET`, `WEB_ORIGIN`, and `API_URL` in the Vercel and Render production
  environment settings.

## CI and deployment

Every pull request runs install, typecheck, lint, test, and build checks. A
successful merge to `main` deploys the web app to Vercel and triggers the API
deployment on Render. Pull requests also run `npm audit --audit-level=high`
and CodeQL analysis.

Configure these GitHub Actions repository secrets before merging to `main`:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` for the web app.
- `RENDER_DEPLOY_HOOK_URL` for the API service.

The deployment workflow reads these values only from the GitHub `production`
environment secrets.
Do not commit provider tokens, project identifiers that are secret, deploy
hooks, or application environment values to the repository.

## Repository layout

```text
apps/web       Next.js frontend
apps/api       Express API and Prisma schema
packages/shared Shared DTOs and validation schemas
docs           Product requirements and mockup reference
```

The prototype in `docs/design` is a visual reference only. Its demo credentials, simulated persistence, and browser-side accounting must not be copied into production behavior.