# ForecastHub – Community Prediction Platform

## Product Requirements Document (PRD)

**Team:** Xinlai Chen, Qiong Wu

**Prototype:** [ForecastHub web app](https://claude.ai/artifact/LvCy6LCDw3Ci83pab18Nz5)

| Screen | What it shows | How to open it | User stories |
|---|---|---|---|
| The Arena (main page) | Questions by category and status, with prices or top answer shares | Shown when you open the prototype link | US-2 |
| Question detail page | One question, where you put credits on an answer and see the crowd prediction | Click a card title, or click an answer on a card to open the question with that answer already selected | US-3, US-4 |
| Sign-in page | Sign in with email and password | Click "Sign in," or try to put credits on an answer while signed out | US-1 |

---

## Table of Contents

1. Overview and Goals
2. Non-Goals
3. Target Users and Roles
4. User Stories and Acceptance Criteria
5. Question Types and Credit Calculation

---

## 1. Overview and Goals

### 1.1 Description

ForecastHub is a prediction app. People often debate upcoming events. Some are campus events, such as how many students will attend the industry panel next Monday, or who will arrive at class first. Many are real-world events, such as which country will win the next World Cup, which team will win the World Series, or how a weekend football game will turn out. People also guess about everyday things, like whether it will rain this weekend or whether gas prices will rise next month. These conversations usually happen casually and are quickly forgotten.

ForecastHub turns these debates into friendly competitions using virtual credits. Every user starts with 1,000 credits and receives free credits every week. Organizers post questions with a list of possible answers, such as "Will the average gas price in California be above $6.00 on December 1?" or "Which country will win the next World Cup?" Users pick an answer and decide how many credits to put on it before the deadline, and they can make more than one prediction on the same question. The crowd prediction updates instantly, and a chart shows how opinions change over time. Predicting early, or choosing an answer that few others believe in, can earn the most when it turns out to be right. When the event ends, the organizer confirms the outcome using the question's stated criteria and source, and credits are paid out to correct predictions. Everyone can compare results on a leaderboard. Credits are virtual only. They cannot be bought, sold, or exchanged for money, and ForecastHub does not involve real money or betting of any kind.

### 1.2 Main user story

> As a user, I want a shared space where I can turn casual debates about upcoming events into friendly prediction competitions, so that predictions are recorded instead of forgotten, and I can see who predicts best over time.

### 1.3 Goals

| ID | Goal |
|---|---|
| G1 | Make it fast and easy to turn a debate into a clear question with a deadline, criteria, and a source. |
| G2 | Record every prediction with a timestamp, so results are fair and can be checked later. |
| G3 | Reward good forecasting, especially predicting early and being right when most others are wrong. |
| G4 | Show how opinions change over time through a live crowd prediction and a history chart. |
| G5 | Keep competition friendly and safe: virtual credits only, no money, and clear moderation tools. |
| G6 | Handle real-life messiness: ambiguous questions, cancelled events, and resolution mistakes. |

### 1.4 Core rules (must always hold)

| ID | Rule |
|---|---|
| CR-1 | ForecastHub never involves real money, betting, or anything that can be exchanged for money. Credits are virtual only. They can never be bought, sold, transferred between users, or exchanged for money or prizes. Users get credits only from the starting balance, weekly free credits, free coupon codes, payouts, refunds, and correction adjustments. |
| CR-2 | All deadlines and times in ForecastHub use Pacific Time (PT) for everyone. There is no time zone setting. |
| CR-3 | **Immutable predictions and moderation.** Every prediction is recorded with a timestamp, the credits actually charged, and the market price or pool totals at that moment. A prediction cannot be changed, withdrawn, sold, or deleted by its user. All moderation and refund actions are recorded. |
| CR-4 | After a question's deadline, no new predictions are accepted. |
| CR-5 | Every question is either an A or B question with two organizer-named answers (priced market) or a multi-answer question with 3 to 10 organizer-listed answers (shared pool). Users always pick from the listed answers and never type their own. Every question has a category, a deadline, clear outcome criteria, and a trusted source. |
| CR-6 | **A or B market accounting.** A or B questions use the Logarithmic Market Scoring Rule (LMSR) with a liquidity parameter of 500 credits. Each question starts at the organizer's chosen starting prices. Market prices are calculated using full precision, while actual share ownership is stored in increments of 0.01 shares. The whole-credit purchase charge is the mathematical ceiling of the LMSR cost of the purchased shares. The actual charge must not exceed the user's entered budget. Each winning share pays 100 credits. Displayed A and B prices are limited to 1–99 and always add up to 100; display limits do not affect LMSR calculations. |
| CR-7 | **Multi-answer pool accounting.** For multi-answer questions, every credit spent goes into one shared pool, and the predictions on the correct answer share the whole pool. Refunds and payout adjustments are recorded without modifying or deleting the original transactions. |


### 1.5 System overview

ForecastHub is a full-stack web application with three parts:

- **Frontend:** A responsive website that runs in the browser on phones and computers.
- **Backend:** A server that handles accounts, sign-in, questions, predictions, prices, payouts, and moderation. It checks every permission and calculates every credit amount, so the browser is never trusted with these.
- **Database:** Stores users, questions, predictions, and every credit transaction.

The backend offers two APIs. The **public API** needs no sign-in and lets anyone read questions, prices, charts, and the leaderboard. The **private API** requires sign-in and is used for making predictions, viewing personal account information, and organizer and administrator actions. Both are documented (see US-8). The backend also pushes live updates to the browser through WebSockets, so prices and pools change on screen the moment anyone predicts.
---

## 2. Non-Goals

The following are intentionally out of scope.

| ID | Non-goal | Reason |
|---|---|---|
| NG-1 | Real money, deposits, payouts, or buying credits in any way | Violates CR-1 and creates gambling and legal risk. |
| NG-2 | Transferring, gifting, trading, or selling credits between users | Anything transferable can gain cash value. |
| NG-3 | Prizes, rewards stores, or links to sportsbooks or betting sites | Same as above. Users may do their own thing offline, but the app does not support it. |
| NG-4 | Changing, withdrawing, or selling a prediction or shares before the question is resolved | Keeps every prediction final and the app simpler to build. Users can add new predictions instead. |
| NG-5 | Users trading shares directly with each other (an order book) | Direct trading needs many active users to work. The app sets A or B prices with a formula instead. |
| NG-6 | Priced markets for multi-answer questions | Pricing many answers at once is much more complex to build and explain. Multi-answer questions use the shared pool. |
| NG-7 | Users typing their own answers | Organizers list every answer, so results are easy to compare, score, and moderate. |
| NG-8 | Questions with more than 10 answers | Long lists are hard to read on a phone. Organizers can add an "Other" answer instead. |
| NG-9 | Automatic resolution from external data feeds | Organizers confirm outcomes manually against the stated source. |
| NG-10 | Showing email addresses, balance histories, or other private account details to anyone but the account owner and Administrators | Visitors and other users see only usernames and public results. |
| NG-11 | Native mobile apps | A responsive web app covers phones and desktops. |
| NG-12 | Chat, comments, or direct messages | Not needed for the core experience. |
| NG-13 | Leaderboard seasons | Possible future feature. The first release has one all-time leaderboard. |

---

## 3. Target Users and Roles

### 3.1 Target users

Anyone who wants to make friendly predictions about upcoming events. The design must work well even when only a few users predict on a question. For A or B questions, the app always offers a price, so a user can predict even if no one else has. For multi-answer questions, one large prediction can move the crowd prediction a lot.

ForecastHub also serves developers who want to read ForecastHub data or build tools on top of it through the documented API.

### 3.2 Roles

Every account has exactly one role. Roles are cumulative: an Organizer can do everything a User can do, and an Administrator can do everything an Organizer can do.

| Role | Who they are | Main responsibilities |
|---|---|---|
| **User** | Anyone who registers on the website | Browse questions, make predictions with credits, redeem coupon codes, view results, charts, and the leaderboard |
| **Organizer** | A user promoted by an Administrator | Create, publish, clarify, and resolve their own questions |
| **Administrator** | The person who sets up the app, plus anyone they promote | Manage users, assign roles, manage categories, create coupon codes, moderate all questions, correct results |

**Setup rule:** The first account created when the app is set up becomes the first Administrator. After that, anyone can register on the public website, and new accounts get the User role.

**Last-admin rule:** The app must always have at least one Administrator. The last Administrator cannot be demoted or removed.

**Everyone can predict:** Users, Organizers, and Administrators all make predictions and appear on the leaderboard.

**Visitors:** People who are not signed in can browse questions, prices, charts, and the leaderboard, but cannot make predictions, redeem coupons, or see any private account information.

---

## 4. User Stories and Acceptance Criteria

### US-1: Register and sign in

> As a user, I want to register an account on the ForecastHub website and sign in, so that I can take part in prediction competitions.

**Acceptance criteria**
1. Anyone can visit the ForecastHub website and browse questions, prices, charts, and the leaderboard without signing in. "Register" and "Sign in" buttons are always visible, and trying to make a prediction while signed out takes me to sign in.
2. To register, I enter a username, an email address, and a password. Usernames must be 2 to 40 characters. Each username and each email address can be used for only one account.
3. When I register, I am signed in right away. My account has the User role, and a balance of 1,000 credits.
4. If my registration details are invalid (for example, the email is already registered or the username is taken), the form shows a clear message next to the field and no account is created.
5. I can sign in with my email address and password, and sign out.
6. When I sign in, the server issues a JWT (JSON Web Token) that the app sends with every private request. The token expires after 7 days, after which I must sign in again. Signing out removes the token from my browser.
7. Passwords are never stored as plain text. The server stores only a secure hash of each password.
8. When I try to register with an email that already has an account, the app suggests signing in instead.

### US-2: Browse questions by category

> As a user, I want to browse prediction questions by category, such as sports, economics, weather, and entertainment, so that I can quickly find the topics I care about.

**Acceptance criteria**
1. The question list shows open questions by default, sorted by soonest deadline.
2. Every question belongs to one category. Common categories, similar to those on prediction markets such as Kalshi, include Sports, Economics, Financials, Crypto, Weather & Climate, Politics, Culture & Entertainment, Tech & Science, Companies, and Campus Events. Administrators can add, rename, or remove categories.
3. I can filter by one or more categories and by status (Open, Closing soon, Closed, Resolved, Cancelled).
4. Each list item shows the question title, category, deadline (in Pacific Time), total credits spent, and either the current prices (for example, "Dodgers 68 · Yankees 32") or the pool shares of the top three answers (for example, "Brazil 42% · France 25% · Argentina 18%").
5. "Closing soon" means the deadline is within 24 hours.
6. Hidden questions and drafts do not appear for Users or visitors.

### US-3: Make predictions with credits

> As a user, I want to choose an answer and decide how many credits to put on it before the deadline, and make more predictions later, including on a different answer, so that I can share my view and compete with others.

**Acceptance criteria**
1. I choose my answer from the answers listed on the question.
2. I enter how many credits I want to spend, at least 10 and no more than my balance. My balance is always shown next to the form.
3. Before I confirm, the form shows how many credits I will be charged and what I can expect to win if my answer is correct. If the amount I could win may still change as others predict, the form says so.
4. If someone else predicts while my form is open and the numbers change, the form shows the updated numbers and asks me to confirm again before any credits are spent.
5. When I confirm, the credits are taken from my balance immediately, and my prediction appears on the question page with its timestamp.
6. A prediction cannot be changed, withdrawn, or sold. I can make any number of additional predictions on the same question, on the same answer or a different one.
7. If I try to spend more credits than I have, the form shows a clear message and nothing is spent.
8. When the deadline has passed, the form is disabled and shows "Predictions closed at [time] PT."
9. If I submit at the exact moment the deadline passes, the server's time decides. A submission received at or after the deadline is rejected with a clear message, and no credits are spent.

### US-4: See the overall prediction and history chart

> As a user, I want to see the overall prediction and a chart of how it has changed over time, so that I can compare my view with others and see how opinions shift.

**Acceptance criteria**
1. The question page shows how the crowd currently sees each answer, as a percentage, and the total credits spent.
2. The question page does not show other users' individual predictions. I cannot see who predicted, which answer they chose, how many credits they spent, or when. I see only the total credits on each answer. My own predictions are listed separately for me, with my answer, credits spent, and time.
3. A line chart shows how the crowd prediction changed, from the moment the question opened to the deadline (or to now, if still open). My own predictions are marked on the chart. Later moderation actions never change earlier points on the chart.
4. The question page receives live updates through a WebSocket connection. Whenever anyone makes a prediction, or a moderation action changes the question, the page updates within 1 second, without reloading.
5. If the live connection drops, the page shows "Reconnecting…", reconnects automatically, and loads the latest data once connected.
6. The chart has a text alternative: a table of each change in the crowd prediction with its time.

### US-5: Earn credits and view the leaderboard

> As a user, I want to earn virtual credits for correct predictions, get free credits regularly, and view a leaderboard, so that I can track my performance and enjoy friendly competition.

**Acceptance criteria**

*Results*
1. When a question is resolved, I see whether each of my predictions won or lost.
2. If I won, I receive credits, and the question page shows how many. If I lost, I do not get back the credits I spent.
3. If the question is cancelled, I get back exactly the credits I spent. Section 5 lists the other cases where credits are refunded.
4. For each resolved question, my results show how many credits I spent, how many I received, and my net gain or loss. Section 5 explains how payouts are calculated.

*Getting credits*

5. Every Monday at 12:00 AM Pacific Time, I automatically receive 100 free credits.
6. I can redeem a coupon code on my profile page to receive the free credits it is worth. Each code can be used only once per user, and a clear message explains when a code is invalid, expired, or already used.
7. My profile shows my current balance and a history of every change to it: starting credits, weekly credits, coupons, predictions, payouts, refunds, and corrections.

*Leaderboard*

8. The public leaderboard shows only rank, username, number of scored questions, and success rate. It does not show net gain or balances. My current balance appears only on my private profile.
9. A scored question is a resolved question I predicted on. It counts as correct when more than half of the credits I spent on it were on the correct answer. My success rate is my correct questions divided by my scored questions, shown as a whole percentage. Cancelled questions never count.
10. Users are ranked by success rate, highest first. Users need at least 5 scored questions to be ranked; others appear below the ranked list as "Not ranked yet." When success rates are equal, the user with more scored questions ranks higher. Users with the same success rate and the same number of scored questions share the same rank and are listed alphabetically.
11. If a result is corrected, my balance and the leaderboard update automatically, and I see a notice explaining what changed.
12. When a question I predicted on is resolved, my balance and results update instantly through the live connection, and I see a notice telling me whether I won or lost.

### US-6: Create and resolve questions

> As an organizer, I want to create prediction questions with a deadline, clear outcome criteria, and a trusted source for the result, then confirm the final outcome, so that competitions are fair and easy to resolve.

**Acceptance criteria**
1. I write the question, choose its category, and set up the answers users can give (Section 5 describes the setup options).
2. I can save a question as a draft and edit it freely before publishing.
3. I cannot publish until the title, answers, category, deadline, event time, outcome criteria, and source are all filled in and valid. After publishing, the answers and their setup cannot be changed.
4. The deadline must be before or at the time the event begins, so no one can predict after the outcome is known.
5. After the deadline, the question appears in my "Ready to resolve" list once its expected resolution time has passed.
6. To resolve, I mark the correct answer and enter a short evidence note, such as a link or a description of what the source showed. The correct answer is shown on the results page so everyone can check it.
7. If there is no clear correct answer, I ask an Administrator to cancel the question, and all credits are refunded.
8. When I resolve, payouts are made as described in Section 5, and the leaderboard updates.

### US-7: Administer the app

> As an administrator, I want to set up the app, manage users, assign organizer permissions, and moderate prediction questions, so that everything stays organized and the platform is used appropriately.

**Acceptance criteria**
1. During setup, I set the app's name and description and become the first Administrator.
2. I can promote a User to Organizer or Administrator, and demote them again (except the last Administrator).
3. I can remove a user, for example a duplicate or abusive account. Removed users cannot sign in and no longer appear on the leaderboard, but their past predictions stay in the record so charts, prices, and other users' payouts do not change.
4. I can hide any question, cancel it with a reason (which refunds all credits), or correct its resolution within 7 days.
5. I can create coupon codes as rewards, for example for joining an event or creating a good question. Each coupon has a credit value, an optional expiry date, and an optional maximum number of uses, and I can revoke it. Coupon codes are always free and can never be sold.
6. Every prediction, coupon redemption, payout, correction, and refund is recorded as an auditable transaction with a timestamp, amount, reason where applicable, and responsible account or system process. Previously recorded transactions are not deleted or overwritten.


### US-8: Use the public and private APIs

> As a developer, I want a documented public API and private API, so that I can build tools that read ForecastHub data or act on my own account.

**Acceptance criteria**

*Public API (no sign-in needed)*
1. Anyone can call the public API without signing in. It is read-only.
2. The public API lets me list questions (with filters for category, status, and type), get one question's details, current prices or answer totals, and chart history, and get the leaderboard (rank, username, scored questions, and success rate). It never returns individual predictions or balances.
3. The public API shows usernames only on the leaderboard, and never shows email addresses, balance histories, or any other private account details.

*Private API (sign-in required)*

4. The private API requires a valid JWT, sent in the `Authorization` header as `Bearer <token>`. A missing or expired token returns a 401 error, and a valid token without the right role returns a 403 error.
5. With my token, I can see my own profile, balance, transaction history, and predictions (but never other users' predictions); preview and make predictions; and redeem coupon codes. I can never see another user's private information.
6. Organizers can create, publish, and resolve their questions through the private API, and Administrators can perform their actions from US-7. The server checks every permission.

*Live updates*

7. A WebSocket connection sends live updates. Public updates (prices and answer totals) are available to everyone and never identify who predicted. Private updates (my balance, payouts, and notices) are sent only to the signed-in user they belong to.

*Documentation and behavior*

8. Both APIs are described in an OpenAPI (Swagger) specification, with an interactive documentation page at `/api/docs`. Each endpoint lists its parameters, whether sign-in is required, example requests and responses, and possible errors. The WebSocket messages are documented on the same page.
9. All endpoints use versioned URLs (for example, `/api/v1/public/questions` and `/api/v1/private/predictions`) and return JSON. Errors return a consistent format with an error code and a plain-language message.
10. The public API allows up to 60 requests per minute from each IP address, and the private API allows up to 120 requests per minute for each user. Requests over the limit receive a 429 error explaining when to try again.
---

## 5. Question Types and Credit Calculation

ForecastHub has two types of questions. The user stories describe what users see in general; this section describes how each type is set up, shown, resolved, and paid out.

### 5.1 A or B questions (priced market)

**Setup, display, and resolution**
- The organizer names the two answers, each unique and up to 40 characters (for example, "Yes" and "No," or "Dodgers" and "Yankees").
- The organizer sets the starting price for A, from 10 to 90 in whole numbers. The starting price for B is set automatically so the two add up to 100 (for example, 70 and 30). The default is 50 and 50. The form explains that the starting price should be a fair first guess.
- Users choose one of the two answers.
- The question page shows each answer's price as a chance (for example, "Dodgers 68 · The crowd thinks the Dodgers are about 68% likely to win"). My own predictions also show the shares I bought and the average price I paid, and the chart shows the price of A over time.
- To resolve, the organizer chooses which of the two answers is correct.

**Pricing**
1. A or B questions use the Logarithmic Market Scoring Rule (LMSR) with a liquidity parameter of 500 credits. In plain words, the app is always ready to sell shares of A or B at the current price, so users can predict even when no one else has.
2. Each answer has a price from 1 to 99, and the two prices add up to 100. A price can be read as the chance the crowd gives that answer.
3. Each question starts at the organizer's starting prices (50 and 50 unless changed). Buying shares of A raises the price of A and lowers the price of B, and buying B does the opposite. Larger purchases move the price more.

**Cost formula**

4. Let A and B be the cumulative A and B shares sold, and let p₀ be the organizer's starting price for A divided by 100. The starting offset, which sets the starting prices and is never paid out, is:

    `A₀ = 5 × ln(p₀ / (1 − p₀))`

5. The LMSR cost function, measured in credits, is:

    `C(A, B) = 500 × ln(exp(100(A + A₀) / 500) + exp(100B / 500))`

6. The unrounded cost of purchasing ΔA shares of A and ΔB shares of B is:

    `C(A + ΔA, B + ΔB) − C(A, B)`

7. The actual credit charge is the ceiling of this cost (rounded up to a whole credit).

**Purchases**

8. When a user enters a credit budget, the system calculates the largest purchase in increments of 0.01 shares whose actual charge does not exceed the budget. The actual charge may be less than the budget, but it must be at least 10 credits.
9. The purchase preview shows the actual charge, the number of shares, the average price, the prices after the purchase, and the payout if the answer is correct.
10. Share quantities are stored in increments of 0.01 shares. Calculations use full precision. Displayed prices are rounded to whole numbers and kept within 1–99, and the displayed price of B is 100 minus the displayed price of A. Display rounding never changes the underlying calculations.

**Payouts**

11. When the question is resolved, each winning share pays exactly 100 credits, and losing shares pay nothing. Payouts are calculated from the stored share quantities, not displayed prices, so they are always whole credits.

**Worked example**

12. A new question asks "Dodgers or Yankees: who will win Game 1?" and starts at 50 and 50. A user enters a budget of 208 credits on the Dodgers. The system finds that 3.54 shares cost 207.70 credits, so the actual charge is 208 credits, for an average price of 58.8. The price of the Dodgers moves from 50 to 67. If the Dodgers win, the user receives 3.54 × 100 = 354 credits, a gain of 146. If the Yankees win, the user receives nothing and loses the 208 credits.

### 5.2 Multi-answer questions (shared pool)

**Setup, display, and resolution**
- The organizer lists 3 to 10 answers, each unique and up to 40 characters (for example, a list of countries or a list of people's names). The organizer can include an "Other" answer when the listed answers might not cover every possible result.
- Users pick one of the listed answers.
- The question page lists every answer, from most to least credits. Each answer shows its total credits, its share of the pool, and the estimated return per credit (for example, "Brazil: 420 credits, 42% of the pool, 1 credit returns about 2.4"). Answers with no credits yet show "No predictions yet." The chart shows the share of credits for each answer over time.
- To resolve, the organizer picks the correct answer from the list.

**Pool**
1. Every credit spent on a multi-answer question goes into one shared pool for that question.

**Estimated return**

2. For each answer with at least one credit, the estimated return per credit is:

    `Current pool total / Current credits on that answer`

3. The estimate uses the current pool before any new purchase, and it excludes the proposed purchase and future predictions, so the actual return may differ. If an answer has no credits, no estimate is shown.

**Payouts**

4. When the question is resolved, all predictions on the correct answer share the whole pool, in proportion to the credits each one spent. For each winning prediction:

    `Payout = Pool total × (Prediction credits / Total winning credits)`

5. Each payout is rounded down to a whole credit. Any credits left over from rounding go to the earliest winning prediction, based on the order the server recorded them.
6. If no prediction is on the correct answer, every prediction is refunded its original charge.

**Worked example**

7. The question "Which country will win the next World Cup?" has a pool of 1,000 credits, and 600 of those credits are on Brazil. Brazil wins. A user who spent 60 credits on Brazil receives 1,000 × (60 / 600) = 100 credits, a gain of 40. A user who spent 50 credits on France receives nothing and loses the 50 credits.

### 5.3 Rules for both question types

1. **Cancellation:** If a question is cancelled, every prediction is refunded its original charge.
2. **Corrections:** If a resolution is corrected, all affected payouts are recalculated. The difference between the old and new amounts is recorded as a new adjustment transaction. Earlier transactions are never changed or deleted.
3. **Negative balances:** A correction can make a balance negative. A user cannot make new predictions until their balance is at least 10 credits.
4. **Net gain:** For each resolved question, a user's net gain is the credits they received minus the credits they spent. It is shown only in the user's private results, never on the leaderboard.
5. **Success rate:** The leaderboard uses success rate, not credits. A resolved question counts as correct for a user when more than half of the credits they spent on it were on the correct answer, so splitting credits evenly across answers never counts as correct. Success rate is correct questions divided by scored questions.

