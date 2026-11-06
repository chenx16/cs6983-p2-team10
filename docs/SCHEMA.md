# ForecastHub database schema

The Prisma schema in [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma)
stores the core domain and keeps prediction and credit history append-only.

```mermaid
erDiagram
    USER ||--o{ QUESTION : organizes
    USER ||--o{ PREDICTION : makes
    USER ||--o{ CREDIT_LEDGER : owns
    CATEGORY ||--o{ QUESTION : classifies
    QUESTION ||--|{ ANSWER : has
    QUESTION ||--o{ PREDICTION : receives
    ANSWER ||--o{ PREDICTION : selected
    QUESTION ||--o{ PRICE_SNAPSHOT : records
    PRICE_SNAPSHOT ||--o{ ANSWER_SNAPSHOT : contains
    ANSWER ||--o{ ANSWER_SNAPSHOT : summarizes
    PREDICTION ||--o| CREDIT_LEDGER : charges

    USER {
      string id PK
      string username UK
      string email UK
      Role role
      int balance
    }
    QUESTION {
      string id PK
      QuestionType type
      QuestionStatus status
      datetime deadline
      datetime eventTime
      string timeZone
    }
    ANSWER {
      string id PK
      string questionId FK
      string text
    }
    PREDICTION {
      string id PK
      int creditsCharged
      decimal shares
      datetime createdAt
    }
    CREDIT_LEDGER {
      string id PK
      LedgerType type
      int amount
      datetime createdAt
    }
    PRICE_SNAPSHOT {
      string id PK
      decimal priceA
      decimal priceB
      int poolTotal
      datetime recordedAt
    }
    ANSWER_SNAPSHOT {
      string snapshotId PK, FK
      string answerId PK, FK
      int creditsTotal
    }
```

`DateTime` values are stored as instants by PostgreSQL. `timeZone` is retained
on each question so clients consistently display deadlines and event times in
Pacific Time. `Prediction`, `CreditLedger`, and snapshot rows have no update
operation in the application model; corrections and refunds must be represented
by new ledger entries.
