# ForecastHub coding guidance

- See [AGENTS.md](../AGENTS.md) for structure and commands
- Treat `docs/PRD.md` as the source of truth for product behavior.
- Keep all credit, prediction, payout, correction, and moderation decisions on the server.
- Use database transactions and append-only records for financial-like credit activity.
- Never mutate or delete an original prediction or ledger transaction.
- Keep Pacific Time explicit for deadlines, displayed times, and scheduled weekly credits.
- Add focused tests before changing LMSR arithmetic, pool payouts, permissions, or correction behavior.
- Do not carry prototype-only demo credentials, simulated persistence, or browser-trusted accounting into production code.
- run with `npm start` and check the app in the browser after UI changes.