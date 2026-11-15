# Sprint 2 Standups — Work History Draft

We used Microsoft Teams for async standups and met periodically. The entries
below are **reconstructed from Git and GitHub**, not copies of Teams messages.
Dates are Pacific dates of the cited activity, not verified standup dates.
Items marked **likely** or **possible** are inferred from the team plan,
assignments, and later work, not confirmed actions or original Teams messages.
Where no blocker was found in the available records, that does not prove there
was none.

## 2026-11-06

**Xinlai**

- Done: Schema and CI/deployment work merged
  ([#25](https://github.com/chenx16/cs6983-p2-team10/pull/25),
  [#26](https://github.com/chenx16/cs6983-p2-team10/pull/26)); fixed API build
  output and Vercel deployment
  ([#28](https://github.com/chenx16/cs6983-p2-team10/pull/28),
  [#29](https://github.com/chenx16/cs6983-p2-team10/pull/29)); added security
  scanning ([#31](https://github.com/chenx16/cs6983-p2-team10/pull/31)).
- Next: Likely review security findings and deployment configuration.
- Blockers: The API build initially emitted no server output; fixed in
  [#28](https://github.com/chenx16/cs6983-p2-team10/pull/28).

**Qiong**

- Done: No dated commit or authored PR found in the checked records; possible
  preparation for the assigned resolution and administrator workflows.
- Next: Likely review the PRD and requirements for payouts and admin tools.
- Blockers: No blocker identified in the available records.

## 2026-11-07

**Xinlai**

- Done: Grouped Dependabot updates
  ([#45](https://github.com/chenx16/cs6983-p2-team10/pull/45)).
- Next: Likely continue the remaining foundation work and coordinate priorities.
- Blockers: Dependency audit upgrades remained deferred in
  [#32](https://github.com/chenx16/cs6983-p2-team10/issues/32).

**Qiong**

- Done: No dated commit or authored PR found in the checked records; possible
  planning for A/B resolution and administrator actions.
- Next: Likely prepare the data and permission requirements for those features.
- Blockers: No blocker identified in the available records.

## 2026-11-11

**Xinlai**

- Done: Authentication, Sprint 2 descoping, and LMSR pricing merged
  ([#47](https://github.com/chenx16/cs6983-p2-team10/pull/47),
  [#49](https://github.com/chenx16/cs6983-p2-team10/pull/49),
  [#50](https://github.com/chenx16/cs6983-p2-team10/pull/50)).
- Next: Likely implement prediction preview and placement.
- Blockers: No blocker identified in the available records.

**Qiong**

- Done: Sprint 2 descoping decisions list both partners as participants
  ([descoping notes](descoping.md)).
- Next: Likely prepare organizer, resolution, live-update, and admin work
  around the narrowed A/B scope.
- Blockers: A likely dependency was the authentication and prediction
  foundations described in the retrospective.

## 2026-11-12

**Xinlai**

- Done: Prediction preview and placement API merged
  ([#52](https://github.com/chenx16/cs6983-p2-team10/pull/52)).
- Next: Likely finish question detail and the prediction panel.
- Blockers: No blocker identified in the available records.

**Qiong**

- Done: No dated commit or authored PR found in the checked records; possible
  preparation for the organizer and administrator work merged the following day.
- Next: Likely build A/B question management and resolution workflows.
- Blockers: No blocker identified in the available records.

## 2026-11-13

**Xinlai**

- Done: Question detail, native-Node ESM fix, and Arena navigation merged
  ([#53](https://github.com/chenx16/cs6983-p2-team10/pull/53),
  [#56](https://github.com/chenx16/cs6983-p2-team10/pull/56),
  [#69](https://github.com/chenx16/cs6983-p2-team10/pull/69)).
- Next: Likely validate Arena behavior and address remaining integration issues.
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
- Next: Likely complete the leaderboard and API documentation.
- Blockers: A payout ledger collision was fixed in
  [#65](https://github.com/chenx16/cs6983-p2-team10/pull/65).

## 2026-11-14

**Xinlai**

- Done: Authentication rate-limit fix and malformed WebSocket path fix merged
  ([#73](https://github.com/chenx16/cs6983-p2-team10/pull/73),
  [#74](https://github.com/chenx16/cs6983-p2-team10/pull/74)).
- Next: Likely continue regression fixes, E2E coverage, and documentation.
- Blockers: Shared-IP authentication lockouts were addressed in
  [#73](https://github.com/chenx16/cs6983-p2-team10/pull/73).

**Qiong**

- Done: Public leaderboard merged
  ([#71](https://github.com/chenx16/cs6983-p2-team10/pull/71)); API documentation
  and rate-limit work merged to a feature branch, not directly to `main`
  ([#72](https://github.com/chenx16/cs6983-p2-team10/pull/72)).
- Next: Likely coordinate remaining API documentation and project validation.
- Blockers: A potential issue inferred from PR history is that API documentation
  PR #72 targeted a feature branch rather than `main`; it was later adapted in
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
- Next: Likely finish the README, demo, and submission materials.
- Blockers: The organizer-resolution-to-leaderboard E2E flow remained open in
  [#17](https://github.com/chenx16/cs6983-p2-team10/issues/17).

**Qiong**

- Done: No dated commit or authored PR found in the checked records; possible
  follow-up on the completed feature work and shared documentation.
- Next: Likely coordinate final review and demo preparation with Xinlai.
- Blockers: No blocker identified in the available records.
