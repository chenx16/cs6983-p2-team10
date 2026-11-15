# ForecastHub database schema

The source of truth is [`schema.prisma`](../apps/api/prisma/schema.prisma).
The diagram includes all models and scalar fields; nullable and unique fields
are marked in descriptions.

```mermaid
erDiagram
    USER ||--o{ QUESTION : organizes
    CATEGORY ||--o{ QUESTION : classifies
    QUESTION ||--o{ ANSWER : has
    QUESTION o|--o| ANSWER : correctAnswer
    USER ||--o{ PREDICTION : makes
    QUESTION ||--o{ PREDICTION : receives
    ANSWER ||--o{ PREDICTION : selected
    USER ||--o{ CREDIT_LEDGER : owns
    USER o|--o{ CREDIT_LEDGER : responsibleFor
    PREDICTION o|--o| CREDIT_LEDGER : charges
    USER ||--o{ ADMIN_AUDIT : responsibleFor
    USER o|--o{ ADMIN_AUDIT : targetOf
    QUESTION o|--o{ ADMIN_AUDIT : subjectOf
    QUESTION ||--o{ PRICE_SNAPSHOT : records
    PRICE_SNAPSHOT ||--o{ ANSWER_SNAPSHOT : contains
    ANSWER ||--o{ ANSWER_SNAPSHOT : summarizes

    USER {
      string id PK
      string username UK
      string email UK
      string passwordHash
      Role role
      int balance
      boolean isActive
      datetime createdAt
      datetime updatedAt
    }
    CATEGORY {
      string id PK
      string name UK
      datetime createdAt
    }
    QUESTION {
      string id PK
      string title
      QuestionType type
      QuestionStatus status
      string categoryId FK
      string organizerId FK
      datetime deadline
      datetime eventTime
      string timeZone
      string outcomeCriteria
      string source
      int startingPriceA "nullable"
      int aSharesHundredths
      int bSharesHundredths
      int marketVersion
      boolean isHidden
      string resolutionNote "nullable"
      string correctAnswerId FK "nullable, unique"
      datetime publishedAt "nullable"
      datetime resolvedAt "nullable"
      datetime createdAt
      datetime updatedAt
    }
    ADMIN_AUDIT {
      string id PK
      AdminAuditAction action
      string targetUserId FK "nullable"
      string questionId FK "nullable"
      Role previousRole "nullable"
      Role newRole "nullable"
      int amount "nullable"
      string reason
      string responsibleUserId FK
      datetime createdAt
    }
    ANSWER {
      string id PK
      string questionId FK
      string text
      int sortOrder
      boolean isOther
      datetime createdAt
    }
    PREDICTION {
      string id PK
      string userId FK
      string questionId FK
      string answerId FK
      int creditsCharged
      decimal shares "nullable, decimal(20,2)"
      decimal priceAAtPurchase "nullable, decimal(12,8)"
      decimal priceBAtPurchase "nullable, decimal(12,8)"
      int poolTotalAtPurchase "nullable"
      string idempotencyKey "nullable"
      datetime createdAt
    }
    CREDIT_LEDGER {
      string id PK
      string userId FK
      LedgerType type
      int amount
      string reason "nullable"
      string predictionId FK "nullable, unique"
      string responsibleUserId FK "nullable"
      datetime createdAt
    }
    PRICE_SNAPSHOT {
      string id PK
      string questionId FK
      datetime recordedAt
      decimal priceA "nullable, decimal(12,8)"
      decimal priceB "nullable, decimal(12,8)"
      int poolTotal
    }
    ANSWER_SNAPSHOT {
      string snapshotId PK, FK
      string answerId PK, FK
      int creditsTotal
    }
```

`Answer` enforces uniqueness for `(questionId, text)` and
`(questionId, sortOrder)`. `Prediction` has a unique
`(userId, idempotencyKey)` constraint, and `AnswerSnapshot` has a composite
primary key `(snapshotId, answerId)`. See the Prisma schema for indexes,
defaults, relation deletion behavior, and enum values.

`DateTime` values represent instants; each question also stores a `timeZone`
whose default is `America/Los_Angeles`. The application retains prediction
and ledger history, recording payouts, corrections, and refunds as ledger
entries. Some schema fields and enum values support features deferred from the
current A/B-only release; their presence does not mean those features are live.
