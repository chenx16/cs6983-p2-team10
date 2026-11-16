# API notes

The authoritative endpoint reference, parameters, examples, errors, and
authentication requirements are in [Swagger](https://cs6983-p2-team10-api.onrender.com/api/docs/).
For local development, visit `http://localhost:4000/api/docs/`.

## Public workflows

```text
GET /api/v1/public/questions
GET /api/v1/public/questions/:questionId
GET /api/v1/public/categories
GET /api/v1/public/leaderboard
WS  /api/v1/public/questions/:questionId/stream
```

The Arena uses `GET /api/v1/public/questions` to list published A/B questions.
By default, it returns open questions before their deadline, ordered by the
soonest deadline. Repeat the `category` parameter to filter by category ID and
use `status=OPEN`, `CLOSING_SOON`, `CLOSED`, `RESOLVED`, or `CANCELLED`.
Closing soon means a future deadline within 24 hours; closed includes open
questions whose deadline has passed. Multi-answer questions are outside the
release scope. Draft and hidden questions are not included.

`GET /api/v1/public/leaderboard` returns rank, username, scored questions, and
whole-number success rate without balances or net gain. Only resolved A/B
questions count; users with fewer than five scored questions appear as not
ranked yet.

Question pages can subscribe to
`WS /api/v1/public/questions/:questionId/stream` for aggregate prices and
credits spent by answer. Messages do not contain user identities or private
balances. The browser reconnects and reloads question data after a disconnect.

## Authenticated workflows

```text
POST  /api/v1/auth/register
POST  /api/v1/auth/login
POST  /api/v1/auth/logout
GET   /api/v1/private/me
POST  /api/v1/private/questions/:questionId/predictions/preview
POST  /api/v1/private/questions/:questionId/predictions
GET   /api/v1/private/questions/:questionId/predictions
GET   /api/v1/private/predictions
POST  /api/v1/private/organizer/categories
GET   /api/v1/private/organizer/questions
POST  /api/v1/private/organizer/questions
PATCH /api/v1/private/organizer/questions/:questionId
POST  /api/v1/private/organizer/questions/:questionId/publish
POST  /api/v1/private/organizer/questions/:questionId/finalize
GET   /api/v1/private/organizer/questions/ready-to-resolve
POST  /api/v1/private/organizer/questions/:questionId/resolve
GET   /api/v1/private/admin/users
GET   /api/v1/private/admin/questions
GET   /api/v1/private/admin/history
PATCH /api/v1/private/admin/users/:userId/role
POST  /api/v1/private/admin/questions/:questionId/cancel
```

Private routes use the `access_token` cookie. A user's
`GET /api/v1/private/predictions` response contains only their own predictions,
including the question, selected answer, charge, shares, timestamp, and
pending, won, lost, or refunded status. The prediction preview and placement
routes calculate prices and validate credits on the server. Administrators
cannot make predictions; Organizers can predict on questions owned by another
organizer, but not their own. Both preview and placement return `403 FORBIDDEN`
when these role restrictions apply.

Organizers and Administrators can use `/organizer` to create and edit owned
drafts, create categories, publish valid A/B questions, close open questions
after their deadline, and resolve eligible questions. Resolution requires an
answer, evidence note, and both the prediction deadline and event time to have
passed. It pays winning predictions or refunds original charges when there are
no winners.

Administrators can search users and questions, change roles, cancel questions,
and review audit history. Cancellation refunds original prediction charges in a
transaction. Role changes and cancellation require a reason, and the last
active Administrator cannot be demoted.
