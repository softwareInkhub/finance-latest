## API Documentation

This document lists all API endpoints exposed under `/api` with their methods, request parameters, and typical JSON responses.

### Notes
- All responses are JSON.
- Unless stated otherwise, errors return `{ error: string }` with an appropriate HTTP status code.

---

### Account

#### GET /api/account
- Query:
  - `accountId` (string, optional) — fetch specific account
  - `bankId` (string, required unless `accountId` provided or `bankId=all`)
  - `userId` (string, optional)
- Response:
  - If `accountId` provided: an account object or `{}`
  - Else: `{ items: Account[], count: number }` (aggregated list based on filters)

#### POST /api/account
- Body:
  - `bankId` (string, required)
  - `accountHolderName` (string, required)
  - `accountNumber` (string, required)
  - `ifscCode` (string, required)
  - `tags` (string[] | undefined)
  - `userId` (string | undefined)
- Response:
  - Newly created account object (includes generated `id`)

#### PUT /api/account/[id]
- Params: `id` (path, string)
- Body:
  - Any of: `bankId`, `accountHolderName`, `accountNumber`, `ifscCode`, `tags`, `userId`
- Response:
  - Updated account object

#### DELETE /api/account/[id]
- Params: `id` (path, string)
- Response:
  - `{ success: true }` on deletion

---

### Bank

#### GET /api/bank
- Response:
  - `{ items: Bank[], count: number }`

#### POST /api/bank
- Body:
  - `bankName` (string, required)
  - `tags` (string[] | undefined)
- Response:
  - Created bank object

#### PUT /api/bank/[id]
- Params: `id` (path, string)
- Body:
  - `bankName` (string)
  - `tags` (string[])
- Response:
  - Updated bank object

#### DELETE /api/bank/[id]
- Params: `id` (path, string)
- Response:
  - `{ success: true }`

---

### Bank Header

#### GET /api/bank-header
- Query:
  - `bankName` (string, required)
- Response:
  - `{ bankName, bankId, header, tag, mapping, conditions }`

#### POST /api/bank-header
- Body:
  - `bankName` (string, required)
  - `bankId` (string | undefined)
  - `header` (array, required)
  - `tag` (object | undefined)
  - `mapping` (object | undefined)
  - `conditions` (object | undefined)
- Response:
  - Saved header config object

---

### Dashboard

#### GET /api/dashboard/summary
- Query:
  - `userId` (string, required)
- Response:
  - `{ banks: Bank[], accounts: Account[], statements: Statement[], totalTransactions: number, recentTransactions: any[] }`

---

### Reports

#### GET /api/reports/cashflow
- Query:
  - `userId` (string, required)
- Response:
  - `{ userId, cashflow: any }`

#### POST /api/reports/cashflow
- Body:
  - `userId` (string, required)
  - `cashFlowData` (any, required)
- Response:
  - `{ success: true }`

#### GET /api/reports/tags-summary
- Query:
  - `userId` (string, required)
- Response:
  - `{ tags: Array<{ id, name, color, count }>, totals: any }`

#### POST /api/reports/tags-summary
- Body:
  - `userId` (string, required)
- Response:
  - `{ success: true }`

#### POST /api/reports/tags-summary/update
- Body:
  - `userId` (string, required)
- Response:
  - `{ success: true }`

---

### Statement (single)

#### GET /api/statement/data
- Query:
  - `statementId` (string, required)
  - `userId` (string, required)
- Response:
  - `{ statement: any, transactions: any[] }`

#### POST /api/statement/delete
- Body:
  - `statementId` (string, required)
  - `s3FileUrl` (string, required)
  - `userId` (string, required)
  - `bankName` (string | undefined)
  - `batchStart` (number | undefined)
  - `batchEnd` (number | undefined)
- Response:
  - `{ success: true }`

#### POST /api/statement/presign
- Body:
  - `key` (string, required)
- Response:
  - `{ url: string, fields?: Record<string, string> }`

#### POST /api/statement/update
- Body:
  - `statementId` (string, required)
  - `userId` (string, required)
  - `fileName` (string, required)
  - `bankName` (string | undefined)
- Response:
  - Updated statement object

#### POST /api/statement/upload
- Body:
  - multipart or JSON file metadata (implementation-specific)
- Response:
  - `{ success: true, statementId?: string }`

---

### Statements (collection)

#### GET /api/statements
- Query:
  - `accountId` (string | undefined)
  - `userId` (string | undefined)
  - `bankId` (string | undefined)
- Response:
  - `{ items: Statement[], count: number }`

---

### Tags

#### GET /api/tags
- Query:
  - `userId` (string, required)
- Response:
  - `{ items: Tag[], count: number }`

#### POST /api/tags
- Body:
  - `name` (string, required)
  - `color` (string | undefined)
  - `userId` (string, required)
- Response:
  - Created tag object

#### PUT /api/tags
- Body:
  - `id` (string, required)
  - `name` (string | undefined)
  - `color` (string | undefined)
- Response:
  - Updated tag object

#### DELETE /api/tags
- Body:
  - `id` (string | undefined) — if provided, delete specific
  - `clearAllTagItems` (boolean | undefined) — if true, clear tag-linked items
- Response:
  - `{ success: true }`

---

### Transaction (single-transaction operations)

#### POST /api/transaction/bulk-update
- Body:
  - `updates` (Array<{ transactionId: string, tags?: string[], bankName: string }>, required)
- Response:
  - `{ success: true, updated: number }`

#### POST /api/transaction/slice
- Body:
  - `csv` (string, required)
  - `statementId` (string, required)
  - `startRow` (number, required)
  - `endRow` (number, required)
  - `bankId` (string, required)
  - `accountId` (string, required)
  - `fileName` (string | undefined)
  - `userId` (string | undefined)
  - `bankName` (string, required)
  - `accountName` (string | undefined)
  - `accountNumber` (string | undefined)
  - `duplicateCheckFields` (string[] | undefined)
  - `s3FileUrl` (string | undefined)
- Response:
  - `{ success: true, inserted: number, duplicates: number }`

#### POST /api/transaction/update
- Body:
  - `transactionId` (string, required)
  - `transactionData` (object | undefined)
  - `tags` (string[] | undefined)
  - `bankName` (string, required)
- Response:
  - Updated transaction object

---

### Transactions (queries)

#### GET /api/transactions
- Query:
  - `accountId` (string | undefined)
  - `userId` (string | undefined)
  - `bankName` (string | undefined)
- Response:
  - `{ items: Transaction[], count: number }`

#### GET /api/transactions/all
- Query:
  - `userId` (string | undefined)
  - `limit` (number | default 1000)
  - `fetchAll` (boolean | default false)
- Response:
  - `{ items: Transaction[], count: number, tagsMap?: any }` (aggregated across all banks)

#### GET /api/transactions/bank
- Query:
  - `bankName` (string, required)
  - `userId` (string | undefined)
- Response:
  - `{ items: Transaction[], count: number }`

#### GET /api/transactions/paginated
- Query:
  - `userId` (string, required)
  - `page` (number, default 1)
  - `limit` (number, default 20)
  - `lastKey` (string | undefined)
- Response:
  - `{ items: Transaction[], pageInfo: { nextLastKey?: string, page: number, limit: number } }`


---

### Users

#### POST /api/users
- Body:
  - `action` ("signup" | "login" | other actions)
  - `email` (string)
  - `password` (string)
  - `name` (string | undefined)
- Response:
  - `{ user: any, token?: string }` or `{ success: true }` depending on action

#### GET /api/users
- Query:
  - `id` (string | undefined)
- Response:
  - If `id` provided: a single user object
  - Else: `{ items: User[], count: number }`

---

### Type Hints

This project uses DynamoDB-backed models; shapes vary across banks. General shapes:
- `Bank`: `{ id, bankName, tags?, userId }`
- `Account`: `{ id, bankId, accountHolderName, accountNumber, ifscCode, tags?, userId }`
- `Statement`: `{ id, bankId, accountId, userId, fileName, ... }`
- `Transaction`: bank-specific fields plus normalized fields like `{ id, userId, amount, date, description, tags? }`
- `Tag`: `{ id, name, color?, userId }`




