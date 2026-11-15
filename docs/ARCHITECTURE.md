# Architecture

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

The web app forwards HTTP `/api/*` requests to the configured API. Question
pages connect directly to the configured API host for WebSocket updates.
Authentication uses an HttpOnly cookie; the API enforces authorization and
performs prediction and credit operations against PostgreSQL. See the
[database schema](SCHEMA.md) for the data model.

## CI/CD

```mermaid
flowchart TD
    PR["Pull request"] --> PRCI["CI: install, audit, migrate,<br/>typecheck, lint, test, build, smoke"]
    PR --> PRCodeQL["CodeQL analysis"]
    PR --> Preview["Vercel preview"]
    PR -->|"Merge into main"| Main["Push to main"]
    Main --> MainCI["CI: validation and tests"]
    Main --> MainCodeQL["CodeQL analysis"]
    MainCI -->|"Validation passes; production environment"| WebDeploy["Deploy web to Vercel"]
    MainCI -->|"Validation passes; production environment"| ApiDeploy["Trigger Render API deploy hook"]
```

The CI and CodeQL workflows also run independently on `main`; the deployment
jobs depend on CI's `validate` job. Vercel preview deployments are separate
from GitHub Actions validation and use the configured preview API. Current
preview settings use the shared deployed API, not an isolated preview database.
Deployment credentials and application secrets are managed in provider and
GitHub environment settings, not in this repository.
