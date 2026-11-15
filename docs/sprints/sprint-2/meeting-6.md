# ForecastHub Team Meeting Notes

**Team 10:** Xinlai Chen, Qiong Wu

---

## Meeting 6 — Resolution, Payouts, and Sprint 2 Release Scope

**Date:** November 11, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Review the completed A/B question lifecycle
2. Verify resolution, payout, and ledger invariants
3. Review organizer workspace and private prediction history
4. Confirm Sprint 2 descoping and release readiness

### Discussion
- **Resolution workflow.** We reviewed the protected Organizer and Administrator resolution APIs. Eligible A/B questions can be resolved once with an answer and evidence note, and the server performs settlement in a database transaction.
- **Payout and accounting safety.** Winning predictions receive the defined `shares × 100` payout. The original prediction ledger entry remains immutable, while payouts are recorded as separate append-only entries. Questions without winners receive refunds according to the retained A/B rules.
- **Organizer workspace.** The organizer UI now separates owned questions, draft editing, and resolution tasks into tabs. Publishing uses the existing server-authorized endpoint, and the question list refreshes after a successful publish.
- **Private prediction history.** Signed-in users can review only their own prediction history, including question, answer, credits, shares, Pacific Time, and settlement status. Public endpoints continue to expose aggregates rather than private user data.
- **Release scope.** We confirmed the Sprint 2 release remains focused on the complete A/B flow from registration and browsing through prediction, live prices, resolution, payout, and the public leaderboard. Multi-answer pools, weekly credits, charts, private profiles, and expanded moderation remain deferred.

### Results

| Result | Pull request |
|---|---|
| Added A/B resolution, payout/refund handling, public results, private outcomes, and organizer resolution controls | [PR #62](https://github.com/chenx16/cs6983-p2-team10/pull/62) |
| Organized the organizer workspace into My Questions, Edit Drafts, and Resolve tabs | [PR #64](https://github.com/chenx16/cs6983-p2-team10/pull/64) |
| Preserved immutable prediction ledger entries and recorded payouts separately | [PR #65](https://github.com/chenx16/cs6983-p2-team10/pull/65) |
| Added server-authorized publishing for organizer draft questions | [PR #67](https://github.com/chenx16/cs6983-p2-team10/pull/67) |
| Added private signed-in-user prediction history and navigation | [PR #68](https://github.com/chenx16/cs6983-p2-team10/pull/68) |

### Decisions

| Decision | Details |
|---|---|
| Resolution authority | Only authorized Organizer or Administrator actions may resolve questions, and every resolution requires evidence. |
| Ledger invariant | Never mutate or reuse the original prediction ledger entry; payouts and refunds are separate append-only records. |
| Privacy boundary | Private prediction history is scoped to the authenticated user; public responses contain no identifying prediction data. |
| Time handling | Question deadlines, prediction timestamps, and history display use explicit Pacific Time conventions. |
| Release scope | Ship the complete A/B workflow and defer multi-answer pools, weekly credits, charts, private profiles, and expanded moderation. |
| Validation | Continue database-backed resolution tests, permission tests, UI tests, and full typecheck, lint, test, and build validation. |

### Action Items

| Owner | Task |
|---|---|
| Xinlai | Continue final Arena, live-update, leaderboard, and public API integration checks. |
| Qiong | Continue final resolution, payout, privacy, and accounting verification. |
| Both | Run the complete A/B flow end to end using the test database and verify the final release scope. |
| Both | Keep deferred features documented and avoid introducing out-of-scope Sprint 2 work. |
