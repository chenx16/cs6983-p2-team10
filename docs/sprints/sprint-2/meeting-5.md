# ForecastHub Team Meeting Notes

**Team 10:** Xinlai Chen, Qiong Wu

---

## Meeting 5 — Organizer Workflows and Live Arena Data

**Date:** November 8, 2026
**Attendees:** Xinlai Chen, Qiong Wu

### Agenda
1. Review progress on the A/B prediction flow
2. Connect organizer question management to the public Arena
3. Confirm role permissions and question lifecycle behavior
4. Coordinate testing and integration for the remaining Sprint 2 work

### Discussion
- **Organizer workflow.** We reviewed the protected Organizer and Administrator APIs for creating, editing, publishing, and finalizing A/B questions. Organizer ownership and role checks must remain enforced by the API, not by the browser.
- **Question lifecycle.** Draft questions can be edited before publication. Published questions must use the configured Pacific Time deadline and follow the supported A/B workflow through finalization and resolution.
- **Arena integration.** The Arena should load published questions from the public API rather than demo data. The public response must contain only visible aggregate question information, ordered by the nearest deadline, with clear loading, error, and empty states.
- **Sprint 2 scope.** We confirmed that the release remains focused on A/B questions and the end-to-end prediction flow. Multi-answer pools, weekly credits, charts, and other deferred features should not expand the implementation scope.
- **Testing and review.** We will continue focused API and UI tests for permissions, ownership, publication state, deadline filtering, and public privacy boundaries. Each change will use partner review and the standard validation checks.

### Results

| Result | Pull request |
|---|---|
| Added protected Organizer and Administrator management workflows and UI | [PR #58](https://github.com/chenx16/cs6983-p2-team10/pull/58) |
| Added the Organizer A/B question creation, editing, publishing, and finalization workflow | [PR #60](https://github.com/chenx16/cs6983-p2-team10/pull/60) |
| Replaced Arena demo data with published A/B questions from the public API | [PR #61](https://github.com/chenx16/cs6983-p2-team10/pull/61) |

### Decisions

| Decision | Details |
|---|---|
| Authorization boundary | Keep Organizer and Administrator permissions enforced on protected server routes, including ownership and workflow checks. |
| Public data boundary | The Arena may show published visible A/B questions and aggregates, but must not expose private predictions, balances, emails, or user identities. |
| Deadline handling | Store and display question deadlines explicitly in Pacific Time and exclude unpublished, hidden, or expired questions from the default Arena view. |
| Release scope | Continue the A/B-only release flow and keep multi-answer, chart, weekly-credit, and expanded moderation features deferred. |
| Quality bar | Cover lifecycle and permission failures with focused tests and run typecheck, lint, tests, and build before merging. |

### Action Items

| Owner | Task |
|---|---|
| Xinlai | Continue Arena, live-update, and public API integration work for published A/B questions. |
| Qiong | Continue organizer, resolution, payout, and permission workflows on the server. |
| Both | Verify the complete organizer-to-Arena-to-prediction flow with realistic database-backed tests. |
| Both | Reconcile remaining Sprint 2 work with the documented descoping decisions before adding new features. |
