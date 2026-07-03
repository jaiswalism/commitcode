# Current Focus

Phase 7 — Retry Queue & Reliability
- Currently, when a submission fails (e.g. rate limit, offline), we push it to the retry queue in `db.ts` but never process it.
- Implement a background alarm (`chrome.alarms`) or interval to periodically process the retry queue.
- Make sure to clear items from the queue once successfully synced.
- Integrate exponential backoff or max attempts limits.
