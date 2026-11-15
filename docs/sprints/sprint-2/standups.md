# Sprint 2 Standups

We used Microsoft Teams for async standups and met periodically. These entries
were compiled from Git, GitHub, and Xinlai's confirmation. Dates use Pacific time
for the cited activity and may differ from the dates of the Teams messages.

## 2026-11-05

**Xinlai**

- Done: Started the A/B-only Sprint 2 flow and aligned LMSR, prediction
  preview, placement, and question-detail requirements with the server-authority
  rules from Meeting 4.
- Next: Implement and review the question detail, prediction panel, and Arena
  integration.
- Blockers: Organizer and question-detail work depended on the prediction and
  authentication foundations.

**Qiong**

- Done: Reviewed the server-side accounting, idempotency, stale-price, and
  private-history requirements for the A/B flow.
- Next: Continue organizer, resolution, and payout workflows on top of the
  shared prediction foundations.
- Blockers: None recorded.

## 2026-11-06

**Xinlai**

- Done: Schema and CI/deployment work merged
  ([#25](https://github.com/chenx16/cs6983-p2-team10/pull/25),
  [#26](https://github.com/chenx16/cs6983-p2-team10/pull/26)); fixed API build
  output and Vercel deployment
  ([#28](https://github.com/chenx16/cs6983-p2-team10/pull/28),
  [#29](https://github.com/chenx16/cs6983-p2-team10/pull/29)); added security
  scanning ([#31](https://github.com/chenx16/cs6983-p2-team10/pull/31)).
- Next: Review security findings and deployment configuration.
- Blockers: The API build initially emitted no server output; fixed in
  [#28](https://github.com/chenx16/cs6983-p2-team10/pull/28).

**Qiong**

- Done: Prepared for the assigned resolution and administrator workflows.
- Next: Review the PRD and requirements for payouts and admin tools.
- Blockers: None recorded.

## 2026-11-07

**Xinlai**

- Done: Grouped Dependabot updates
  ([#45](https://github.com/chenx16/cs6983-p2-team10/pull/45)).
- Next: Continue the remaining foundation work and coordinate priorities.
- Blockers: Dependency audit upgrades remained deferred in
  [#32](https://github.com/chenx16/cs6983-p2-team10/issues/32).

**Qiong**

- Done: Planned A/B resolution and administrator actions.
- Next: Prepare the data and permission requirements for those features.
- Blockers: None recorded.

## 2026-11-08

**Xinlai**

- Done: Reviewed the organizer-to-Arena lifecycle, public aggregate response
  boundary, Pacific Time deadlines, and A/B-only release scope from Meeting 5.
- Next: Continue Arena, live-update, and public API integration work.
- Blockers: The Arena depended on published organizer questions and the public
  API.

**Qiong**

- Done: Confirmed server-side ownership, role, publication, deadline, and
  privacy checks for organizer workflows.
- Next: Continue organizer, resolution, payout, and permission workflows.
- Blockers: None recorded.

## 2026-11-11

**Xinlai**

- Done: Authentication, Sprint 2 descoping, and LMSR pricing merged
  ([#47](https://github.com/chenx16/cs6983-p2-team10/pull/47),
  [#49](https://github.com/chenx16/cs6983-p2-team10/pull/49),
  [#50](https://github.com/chenx16/cs6983-p2-team10/pull/50)).
- Next: Implement prediction preview and placement.
- Blockers: None recorded.

**Qiong**

- Done: Confirmed the Sprint 2 descoping decisions and the resolution, payout,
  ledger, and private-history invariants from Meeting 6
  ([descoping notes](descoping.md)).
- Next: Prepare organizer, resolution, live-update, and admin work
  around the narrowed A/B scope.
- Blockers: Organizer and resolution work depended on the authentication and
  prediction foundations described in the retrospective.

## 2026-11-12

**Xinlai**

- Done: Prediction preview and placement API merged
  ([#52](https://github.com/chenx16/cs6983-p2-team10/pull/52)).
- Next: Finish question detail and the prediction panel.
- Blockers: None recorded.

**Qiong**

- Done: Prepared organizer and administrator work merged the following day.
- Next: Build A/B question management and resolution workflows.
- Blockers: None recorded.

## 2026-11-13

**Xinlai**

- Done: Question detail, native-Node ESM fix, and Arena navigation merged
  ([#53](https://github.com/chenx16/cs6983-p2-team10/pull/53),
  [#56](https://github.com/chenx16/cs6983-p2-team10/pull/56),
  [#69](https://github.com/chenx16/cs6983-p2-team10/pull/69)).
- Next: Validate Arena behavior and address remaining integration issues.
- Blockers: Render's native-Node ESM import failure was fixed in
  [#56](https://github.com/chenx16/cs6983-p2-team10/pull/56).

**Qiong**

- Done: Organizer and administrator tools, A/B question management,
  resolution, prediction history, and live updates merged
  ([#58](https://github.com/chenx16/cs6983-p2-team10/pull/58),
  [#60](https://github.com/chenx16/cs6983-p2-team10/pull/60),
  [#62](https://github.com/chenx16/cs6983-p2-team10/pull/62),
  [#68](https://github.com/chenx16/cs6983-p2-team10/pull/68),
  [#70](https://github.com/chenx16/cs6983-p2-team10/pull/70)).
- Next: Complete the leaderboard and API documentation.
- Blockers: A payout ledger collision was fixed in
  [#65](https://github.com/chenx16/cs6983-p2-team10/pull/65).

## 2026-11-14

**Xinlai**

- Done: Authentication rate-limit fix and malformed WebSocket path fix merged
  ([#73](https://github.com/chenx16/cs6983-p2-team10/pull/73),
  [#74](https://github.com/chenx16/cs6983-p2-team10/pull/74)).
- Next: Continue regression fixes, E2E coverage, and documentation.
- Blockers: Shared-IP authentication lockouts were addressed in
  [#73](https://github.com/chenx16/cs6983-p2-team10/pull/73).

**Qiong**

- Done: Public leaderboard merged
  ([#71](https://github.com/chenx16/cs6983-p2-team10/pull/71)); API documentation
  and rate-limit work merged to a feature branch, not directly to `main`
  ([#72](https://github.com/chenx16/cs6983-p2-team10/pull/72)).
- Next: Coordinate remaining API documentation and project validation.
- Blockers: API documentation PR #72 targeted a feature branch rather than
  `main`; it was later adapted in
  [#79](https://github.com/chenx16/cs6983-p2-team10/pull/79).

## 2026-11-15

**Xinlai**

- Done: Refund display, leaderboard ordering, and resolution-time fixes merged
  ([#75](https://github.com/chenx16/cs6983-p2-team10/pull/75),
  [#76](https://github.com/chenx16/cs6983-p2-team10/pull/76),
  [#77](https://github.com/chenx16/cs6983-p2-team10/pull/77)); Playwright
  coverage and documentation merged
  ([#78](https://github.com/chenx16/cs6983-p2-team10/pull/78),
  [#79](https://github.com/chenx16/cs6983-p2-team10/pull/79),
  [#80](https://github.com/chenx16/cs6983-p2-team10/pull/80)).
- Next: Finish the README, demo, and submission materials.
- Blockers: The organizer-resolution-to-leaderboard E2E flow remained open in
  [#17](https://github.com/chenx16/cs6983-p2-team10/issues/17). Subsequent
  coverage was added in [PR #84](https://github.com/chenx16/cs6983-p2-team10/pull/84).

**Qiong**

- Done: Consolidated meeting notes
  [PR #90](https://github.com/chenx16/cs6983-p2-team10/pull/90).
- Next: Coordinate final review and demo preparation with Xinlai.
- Blockers: None recorded.
