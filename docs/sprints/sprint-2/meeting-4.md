# ForecastHub Team Meeting Notes

**Team 10:** Xinlai Chen, Qiong Wu

---

## Meeting 4 — Sprint 2 A/B Prediction Flow

**Date:** November 5, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Start Sprint 2 using the foundations completed in Sprint 1
2. Prioritize the end-to-end A/B prediction workflow
3. Coordinate server-side pricing, prediction APIs, and question detail UI
4. Define testing and review expectations for the next implementation cycle

### Discussion
- **Sprint 2 priority.** Building on the authentication, deployment, and security foundations from Meeting 3, we prioritized a complete A/B flow: browse a question, inspect its current prices, preview a prediction, place it with server validation, and view the user's prediction history.
- **Server-authoritative pricing.** The LMSR engine must remain on the server and shared package boundary. Prices, shares, charges, rounding, and balance checks must not depend on browser calculations.
- **Prediction workflow.** Preview and placement should be separate operations. Placement must use a database transaction, preserve immutable prediction history, support idempotency, reject stale prices through `minShares`, and record the prediction charge in the ledger.
- **Question detail experience.** The question detail page should show public A/B information and provide authenticated prediction controls. Private prediction history must remain limited to the signed-in user, while public responses expose aggregate data only.
- **Testing and collaboration.** Business-rule tests should be written before implementation where practical. The partners will continue using issue branches, pull requests, partner review, and the complete validation suite before merging.

### Results

| Result | Pull request |
|---|---|
| Implemented the server-side A/B LMSR pricing engine with stable arithmetic and share precision | [PR #50](https://github.com/chenx16/cs6983-p2-team10/pull/50) |
| Added prediction preview and placement APIs with transactions, idempotency, stale-price protection, and ledger charges | [PR #52](https://github.com/chenx16/cs6983-p2-team10/pull/52) |
| Added public question detail, private prediction history, and the prediction panel UI | [PR #53](https://github.com/chenx16/cs6983-p2-team10/pull/53) |

### Decisions

| Decision | Details |
|---|---|
| Release focus | Prioritize the complete A/B prediction flow before expanding to additional question types or secondary features. |
| Accounting authority | Keep pricing, charges, balances, permissions, and prediction writes on the server using Prisma transactions and append-only ledger records. |
| Prediction safety | Require a server preview before placement, support idempotency keys, and reject unfavorable price changes with a fresh preview. |
| Privacy boundary | Public question detail contains aggregates; private prediction history is available only to the authenticated user. |
| Quality bar | Commit focused failing tests before business-rule implementations and run typecheck, lint, tests, and build before merge. |

### Action Items

| Owner | Task |
|---|---|
| Xinlai | Continue the question detail, Arena, and live-update work for the A/B release flow. |
| Qiong | Continue the server-side prediction, accounting, and organizer workflows. |
| Both | Review the A/B flow end to end and identify any remaining integration gaps before the Sprint 2 deadline. |
| Both | Document any deferred scope explicitly and keep the release focused on A/B questions. |
