# ForecastHub

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

The API starts on `http://localhost:4000`. The web app starts on `http://localhost:3000`. OpenAPI documentation is available at `http://localhost:4000/api/docs`.

The API currently requires a `JWT_SECRET` of at least 32 characters. The example environment file contains a local development value; use a separately generated secret outside local development.

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

## Repository layout

```text
apps/web       Next.js frontend
apps/api       Express API and Prisma schema
packages/shared Shared DTOs and validation schemas
docs           Product requirements and mockup reference
```

The prototype in `docs/design` is a visual reference only. Its demo credentials, simulated persistence, and browser-side accounting must not be copied into production behavior.