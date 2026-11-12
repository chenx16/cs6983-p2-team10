# Sprint 2 Descoping Decisions

**Date:** November 11, 2026
**Participants:** Xinlai Chen (`chenx16`) and Qiong Wu (`qiong-wu-2317`)
**Tracking issue:** [#48](https://github.com/chenx16/cs6983-p2-team10/issues/48)

## Why we descoped

The course timeline is short, so a complete core workflow is more valuable than
several partially finished features. We are focusing this release on the
end-to-end A/B prediction flow:

`register/sign in -> browse questions -> place an A/B prediction -> receive live price updates -> resolve -> pay out -> view the public leaderboard`

## Decision principles

1. Preserve rubric requirements: authentication, three roles, live updates,
   public API and documentation, security scanning, preview deployments, and
   E2E coverage.
2. Prioritize a complete A/B flow from the browser through the API and database.
3. Defer features that are useful but not required to demonstrate that flow.
4. Keep deferred schema structures when removing them would require a risky
   migration late in the course.

## Issue decisions

The estimates below are the current estimates recorded in the issues after
descoping. Savings compare the earlier issue estimates with these current
estimates.

| Issue | Current estimate | Decision | Deferred or removed scope | Estimated points saved |
|---|---:|---|---|---:|
| #5 | 3 | Narrowed | Multi-answer pool shares in the Arena; remove static multi-answer and chart placeholders when mock data is replaced | 2 |
| #6 | 3 | Narrowed | Multi-answer question creation and publishing | 2 |
| #7 | 3 | Retained | None; the LMSR engine remains A/B-only | 2 |
| #8 | 5 | Retained | None; authenticated users can place A/B predictions | 0 |
| #9 | 3 | Retained | None; the question detail flow remains A/B-only | 0 |
| #10 | 3 | Closed | Multi-answer predictions and shared pools | 3 |
| #11 | 3 | Narrowed | Crowd history chart, chart text alternative, and private balance/payout/notice pushes | 2 |
| #12 | 3 | Narrowed | Multi-answer/shared-pool settlement, pool rounding, cancellation and refunds | 2 |
| #13 | 2 | Narrowed | Private profile, balance history, and private per-question results | 1 |
| #14 | 3 | Closed | Weekly credits and coupon codes | 3 |
| #15 | 3 | Narrowed | User removal, hiding, corrections, category management, and other moderation tools; retains cancellation and refunds | 2 |
| #16 | 3 | Narrowed | Multi-answer, chart, weekly-credit, coupon, private-profile, and balance-history API surfaces | 0 |
| #17 | 3 | Narrowed | Multi-answer, coupon, weekly-credit, profile, balance-history, and chart E2E assertions | 0 |
| #18 | 2 | Closed/merged | Separate permission issue; rules moved into #6, #8, #9, #12, #15, and #16 | 2 |
| #32 | — | Closed/deferred | Prisma and Next.js major-version audit upgrades remain future security work | — |
| #48 | 1 | Documentation | Sprint 2 descoping decisions and release-scope guidance | 0 |

Security scanning and preview deployment remain in scope and are recorded as
complete in #17 (PRs #31 and #26). The separate preview and production
environment configuration is also complete and documented.

## Retained release flow

1. A visitor registers or signs in and receives a secure authenticated session.
2. The visitor browses public A/B questions by category and status.
3. An authenticated user chooses an A/B answer and submits a server-validated
   prediction before the deadline.
4. The server records the immutable prediction and updates the A/B LMSR price.
5. Other users viewing the question receive the public price update through
   WebSockets.
6. An authorized Organizer resolves the A/B question with an evidence note.
7. Winning shares receive the defined payout through an append-only ledger
   transaction.
8. The public leaderboard reflects resolved A/B results.

## Future work

The following work remains documented for a later release:

- Multi-answer questions and shared-pool pricing, predictions, and payouts
- Weekly credits and coupon codes
- Crowd prediction history charts and their text alternatives
- Private profiles, balance history, and private result history
- User removal, hiding, correction, and category-management tools
- Private WebSocket balance, payout, and notice updates
- Prisma and Next.js major-version upgrades for the known audit findings

## Risks and compatibility

The Prisma schema still contains the `MULTI_ANSWER` question type, shared-pool
fields, and `WEEKLY`/`COUPON` ledger enum values. They are intentionally retained
to avoid a late migration and can support future work. The release scope is
enforced through the issues and contributor guidance rather than by deleting
these dormant schema structures.
