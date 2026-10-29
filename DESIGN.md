---
name: ForecastHub
colors:
  primary: "#15181F"
  secondary: "#626A7C"
  tertiary: "#2F6FEB"
  neutral: "#F2F3F6"
typography:
  h1:
    fontFamily: Instrument Sans
    fontSize: 1.625rem
  body-md:
    fontFamily: Instrument Sans
    fontSize: 1rem
  label-caps:
    fontFamily: Instrument Sans
    fontSize: 0.75rem
rounded:
  sm: 8px
  md: 16px
spacing:
  sm: 8px
  md: 16px
---

## Overview

ForecastHub is a focused forecasting dashboard: calm, compact, and information
first. The visual language uses a neutral application canvas, white surfaces,
blue action emphasis, and clear green/red outcome states. Prefer hierarchy and
restrained decoration over marketing-style effects.

This document is the implementation source of truth for ForecastHub's visual
language. It is derived from the Arena artifact at
[`docs/design/ForecastHub – The Arena.html`](./docs/design/ForecastHub%20%E2%80%93%20The%20Arena.html).
The mockup is a visual reference only: production data, authentication,
accounting, and permissions must come from the server.

The frontend uses Next.js and TailwindCSS. Expressive visual tokens should be
implemented through the Tailwind theme or CSS variables generated from this
document, not by manually copying large blocks of prototype CSS.

## Colors

The palette is rooted in neutral application surfaces with blue interaction
states and explicit outcome colors.

- **Primary (#15181F):** Ink for headlines and core text.
- **Secondary (#626A7C):** Slate for borders, captions, metadata, and supporting text.
- **Tertiary (#2F6FEB):** Blue for primary actions, links, focus states, and selected tabs.
- **Neutral (#F2F3F6):** Cool gray application background.
- **Positive (#0F8A4F):** Correct or successful outcomes.
- **Negative (#C9333B):** Incorrect outcomes and validation errors.
- **Urgent (#C2410C):** Active or closing-soon status.

Never use color alone to communicate correctness, status, or validation. Pair
color with text, icons, labels, or shape.

## Tokens

### Color

Use semantic tokens so light and dark themes can change without rewriting
components.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F2F3F6` | `#111317` | Application background |
| `side` | `#FFFFFF` | `#16181D` | Sidebar and navigation |
| `surface` | `#FFFFFF` | `#1B1E24` | Cards and panels |
| `surface-2` | `#F3F4F7` | `#23272F` | Inputs, selected-neutral states, bars |
| `ink` | `#15181F` | `#ECEEF2` | Primary text |
| `muted` | `#626A7C` | `#9AA1AF` | Secondary text |
| `line` | `#DFE2E9` | `#2B3038` | Borders and dividers |
| `accent` | `#2F6FEB` | `#3B82F6` | Primary actions, links, focus |
| `yes` | `#0F8A4F` | `#3DD68C` | Positive/correct outcome |
| `no` | `#C9333B` | `#FF6B70` | Negative/incorrect outcome |
| `hot` | `#C2410C` | `#FF9D5C` | Urgent or active status |
| `soon` | `#B45309` | `#F5B14C` | Approaching deadline |
| `bar` | `#E6E9EF` | `#262A32` | Pool background |
| `bar-fill` | `#CFE0FF` | `#1F3A66` | Pool/share fill |

Never use color alone to communicate correctness, status, or validation. Pair
color with text, icons, labels, or shape.

### Typography

- Primary font: `Instrument Sans`, falling back to `Segoe UI`, system sans, and
  `sans-serif`.
- Use `font-variant-numeric: tabular-nums` for prices, percentages, balances,
  dates, and table values.
- Page titles are semibold with tight letter spacing.
- Supporting text uses the muted token and approximately `1.45` line height.
- Use sentence case for headings and controls; reserve uppercase for compact
  metadata labels.

### Layout and shape

- Desktop application layout: a fixed/sticky `248px` sidebar and a flexible
  content area.
- Main content padding: `28px` horizontal and `48px` bottom on desktop.
- Responsive card grid: `minmax(290px, 1fr)` with `16px` gaps.
- Standard card/panel radius: `16px`; authentication card radius: `18px`;
  controls and tags: `10px`; pills: `999px`.
- Standard panel padding: `18px`; authentication card padding: `28px`.
- Use one-pixel borders with the `line` token. Avoid heavy shadows.
- At widths below approximately `1040px`, stack detail layouts into one column.
- At mobile widths, replace the sidebar with a compact mobile bar and preserve
  comfortable touch targets.

## Components and behavior

### Navigation

The sidebar contains the ForecastHub brand, primary links, and account actions.
The active route uses a `surface-2` background and primary text. Navigation
must remain usable with keyboard focus and have an equivalent mobile layout.

### Status filters and tabs

Status filters are outlined pills; the selected filter uses the `ink` border.
Category tabs are horizontally scrollable when necessary; the selected tab uses
the `accent` background and white text. Include counts where the product
provides them.

### Question cards

Question cards use a white/dark surface, a border, `16px` radius, and compact
metadata. They show the title, category, deadline, total credits, and current
market state.

- A/B markets use two green/red answer buttons and a split bar.
- Multi-answer markets use stacked options with a filled share bar.
- Closed or resolved cards are visually subdued but remain readable.
- Avoid optimistic client-side values; display server responses and explicit
  loading/error states.

### Question detail

Use a responsive two-column layout: evidence and crowd state on the left,
prediction form on the right. The prediction form is sticky on desktop and
normal flow on smaller screens.

Show the criteria, trusted source, Pacific Time deadline, live status, price or
pool information, chart/history, and the user's private prediction state only
when authorized. Live updates must not identify individual predictors.

### Prediction form

Use a labeled answer fieldset, a clearly labeled credit amount input, optional
quick amount buttons, server-generated preview, and a primary confirmation
button. The preview must show actual charge, shares or pool effect, average
price, resulting prices, and potential payout where applicable.

Disable or replace the form after the deadline. Show validation errors next to
the relevant field and announce server errors accessibly. Submitted predictions
must be described as immutable.

### Charts, tables, and notices

Charts must include a visible legend and accessible text/table alternatives.
Use tooltips only as an enhancement. Tables should scroll horizontally on small
screens and use tabular numerals.

Use green for successful outcomes, red for errors or negative outcomes, amber
for time-sensitive notices, and neutral surfaces for informational notices.
Always include meaningful text.

### Authentication

The sign-in card is centered, constrained to approximately `400px`, and uses
visible labels, inline validation, password visibility controls where needed,
and a clear route back to the Arena. Never display prototype credentials in the
production UI.

## Accessibility and interaction

- Use semantic landmarks, headings, lists, forms, fieldsets, labels, and buttons.
- Every interactive control needs a visible accessible name.
- Preserve `:focus-visible` outlines using the accent color.
- Maintain keyboard access for navigation, filters, tabs, answer choices, forms,
  charts, dialogs, and toasts.
- Keep touch targets comfortably clickable and do not rely on hover.
- Respect `prefers-reduced-motion`; disable pulsing and nonessential animation.
- Maintain readable contrast in both themes and test status colors with text.
- Announce async loading, validation errors, successful submissions, and live
  updates through appropriate status regions.
- Do not expose private balances, predictions, emails, tokens, or identities in
  public UI or accessibility text.

## Implementation checklist

Before merging a UI change:

1. Confirm the behavior against [`docs/PRD.md`](./docs/PRD.md).
2. Use the tokens and component behavior in this document.
3. Implement with Next.js and TailwindCSS; derive theme values from these
   tokens instead of hand-copying prototype CSS.
4. Verify loading, empty, error, closed, and responsive states.
5. Test keyboard navigation, focus, contrast, reduced motion, and screen-reader
   labels.
6. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
7. Start the app and inspect the changed flow in a browser.
