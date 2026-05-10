# Hubby Backend Challenge — Bulk SMS Campaign Service

A small backend service for creating SMS campaigns, uploading recipient CSVs, sending templated SMS messages in the background, and tracking campaign delivery status.

Built for the Hubby Backend Challenge.

---

## Tech Stack

* Node.js
* TypeScript
* Express
* SQLite (`better-sqlite3`)
* Vitest
* Multer (file uploads)
* csv-parse (CSV parsing)
* Zod (validation)

---

## How to Install

```bash
npm install
```

---

## How to Run

```bash
npm start
```

The server starts on:

```txt
http://localhost:3000
```

SQLite database file is created automatically at:

```txt
data/app.db
```

---

## How to Test

```bash
npm test
```

Also useful:

```bash
npm run typecheck
```

---

## API

```bash
# Create a campaign
curl -X POST http://localhost:3000/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Expiry reminder","sender":"Hubby","template":"Hi {{first_name}}, your plan ends on {{expiry}}."}'

# Upload recipients CSV and start sending
curl -X POST http://localhost:3000/campaigns/1/recipients \
  -F "file=@examples/sample.csv"

# Check campaign progress
curl http://localhost:3000/campaigns/1
```

CSV must contain an `iccid` column. Any additional columns become template variables used in the campaign template.



---

## Design Notes / Trade-offs

### 1. SQLite + Raw SQL over ORM
The schema is small enough (`campaigns` + `recipients`) that raw SQL with `better-sqlite3` gives more explicit control over things like unique constraints and retry state transitions than an ORM would, while keeping idempotency logic (`UNIQUE(campaign_id, iccid)`) easy to review.

### 2. Idempotent Recipient Upload
Re-uploading the same CSV won't resend recipients that already exist for the campaign — enforced at the database level with `UNIQUE(campaign_id, iccid)`. This felt like the most realistic stretch goal because it improves correctness without much added complexity.

### 3. Fake SMS Client Behind an Interface
The send worker depends on a `SmsClient` interface rather than the fake implementation directly, so the provider is swappable without touching sending logic — in production this would just be a Twilio or Vonage adapter.

### 4. CSV Parsing
Parsing uses `createReadStream()` with `csv-parse` to avoid loading the full file at once, though rows are still collected in memory before processing — an acceptable trade-off given the 10k-row ceiling and the time-box.

### 5. Retry Strategy + Concurrency
Transient failures retry up to 3 times with exponential backoff (250ms → 500ms → 1000ms), while permanent failures are not retried. Sends run with bounded concurrency of 5 recipients at a time to keep the implementation simple while preventing uncontrolled parallel sends.

---

## What I Would Do With More Time

* Add stronger distinction between failed states, such as `failed_permanent` vs `failed_max_retries`, so operators can tell whether a recipient failed due to a non-retryable provider error or exhausted retries.
* Add a `GET /campaigns/:id/recipients` endpoint with pagination, so large campaigns can be inspected recipient-by-recipient rather than only through aggregate counts.
* Add webhook support for delivery receipts, allowing recipient status to update based on provider confirmations after the initial send.
* Add integration tests around the full CSV upload flow (upload → validation → persistence → background sending), not just the focused unit tests for template rendering and retry logic.
* Add stronger ICCID validation (length, format) if business requirements called for it — currently the service accepts any non-empty string.
* Improve crash recovery beyond resetting `sending → queued` on startup by tracking in-flight jobs more precisely for safer resume behavior.
* Add upload-level locking and import tracking to improve visibility into concurrent uploads and reduce unnecessary duplicate insert attempts.

---

## Known Limitations

* In-flight jobs are not resumed perfectly after a crash — on startup, recipients stuck in `sending` are reset to `queued`, which is safe but doesn't preserve the exact state of an interrupted send.
* CSV rows are streamed from disk but still collected in memory before processing, which is an acceptable trade-off for the stated 10k-row ceiling but wouldn't scale to very large imports.
* Failed recipients are not re-sent by re-uploading the CSV — retries happen only inside the send worker, so permanently failed recipients would need a dedicated retry workflow in a more complete system.

---

## Time Spent

Approximately 4–5 hours.

Most of the time was spent on the core backend flow. The additional time beyond the initial 4-hour target was mainly used for manual validation of edge cases, improving error handling, and writing the README.

