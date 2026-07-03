# CommitCode — Implementation Plan


## Phase 0 — Project Scaffolding

1. Init repo, MIT license, `.gitignore`, README stub.
2. Set up Manifest V3 skeleton (`manifest.json`) with **zero permissions** initially — add them one at a time as each phase actually needs them, so the permission list stays honest and auditable.
3. Pick build tooling: Vite + `@crxjs/vite-plugin` (handles MV3 hot-reload well) or plain esbuild if you want minimal deps. Given your stack preferences, Vite is the better fit.
4. TypeScript config, strict mode on — this extension touches a lot of external data shapes (GitHub API, DOM scraping) where types catch real bugs.
5. Load unpacked in Chrome, confirm it installs with an empty popup. This is your "hello world" checkpoint.

---

## Phase 1 — Storage Layer 

Everything downstream — settings, logs, queue — reads/writes here, so get the schema right first.

1. Define TypeScript interfaces for `Settings`, `ProblemRecord`, `SyncLogEntry`, `RetryQueueItem` (per the PRD data model).
2. Wrap `chrome.storage.local` in a small typed module (`storage/db.ts`) with `get<T>(key)`, `set<T>(key, value)`, namespaced keys (`settings`, `problems:<id>`, `log:<date>`, `queue`).
3. Add a migration/versioning stub now (`schemaVersion` field) — cheap to add early, painful to retrofit later.
4. Unit test the wrapper against a mocked `chrome.storage` (e.g. `sinon-chrome` or a hand-rolled mock).

---

## Phase 2 — GitHub Client

This is the highest-risk integration (auth, rate limits, encoding) — build and test it standalone before wiring it to LeetCode.

1. Options page field for PAT entry. Store encrypted-at-rest via `chrome.storage.local` (Chrome encrypts local storage on disk at the OS level; document this honestly rather than implying custom encryption).
2. `github/client.ts`: functions for
   - `testConnection(pat, repo)` — GET repo metadata, confirm Contents R/W scope.
   - `getFile(path)` — GET contents endpoint, capture `sha` (required for updates).
   - `putFile(path, content, message, sha?)` — PUT contents endpoint, base64-encode content.
   - `listDirectory(path)` — for duplicate/version detection later.
3. Handle GitHub error codes explicitly: 401 (bad token), 403 (rate limit), 404 (repo/path missing), 409 (sha conflict from concurrent edit).
4. Manual test: hardcode a test repo, push a dummy file via the popup, confirm it lands correctly with the right commit message.

**Checkpoint:** can manually trigger an upload to a real repo. Nothing LeetCode-related exists yet.

---

## Phase 3 — LeetCode Platform Adapter (detection + extraction)

The riskiest and most fragile part per your own Problem Statement — isolate it behind the `PlatformAdapter` interface from day one so a UI change only breaks this file.

1. Implement `platforms/leetcode/adapter.ts` against the `PlatformAdapter` interface (`detectSubmission`, `extractProblem`, `extractCode`, `extractLanguage`, `extractDifficulty`, `extractMetadata`).
2. Detection approach — prefer **network interception** over DOM scraping where possible: LeetCode's submission result comes back via an XHR/fetch response; a content script can listen for that response (via `chrome.webRequest` isn't available for reading bodies in MV3 without extra permissions, so more realistically: inject a small page-context script that monkey-patches `fetch`/`XHR` and posts results to the content script via `window.postMessage`). This is more resilient to CSS/DOM churn than selector-scraping, which directly addresses the reliability problem in your PRD.
3. Fallback DOM scraping for fields not present in the network payload (e.g. confirming "Accepted" badge visibly rendered, extracting the code editor's current content if not in the response).
4. Extract: title, slug/id, difficulty, language, runtime, memory, tags (if available), code, submission timestamp, URL.
5. Test against real accepted submissions across a few difficulty/language combinations. Log raw extracted objects to console during dev — don't wire to GitHub yet.

**Checkpoint:** open dev console on a LeetCode submission page, see a correctly-populated `ProblemRecord` object logged after every Accepted result.

---


---

## Phase 5 — README Generator

1. `github/readme-generator.ts`: given all stored `ProblemRecord`s, generate markdown — header, stats (total solved, difficulty breakdown), and a problem table.
2. Link resolution: dynamically link to the correctly resolved paths for all uploaded solutions based on the active `versionMode` and `folderStructure`.
3. Regenerate and `putFile` the README after every successful sync in the Sync Engine (Phase 4).
4. Guard against races: if two syncs happen in quick succession, make sure the README's `sha` is re-fetched before each update (409 handling from Phase 2 matters here).

**Checkpoint:** after a handful of syncs, README in the repo accurately reflects solved count, difficulty breakdown, and links to the right file versions.

---

## Phase 6 — Commit Message Templating

1. Simple template engine: `{title}`, `{difficulty}`, `{language}`, `{runtime}`, `{memory}` placeholders substituted into a user-defined string (default template from the PRD).
2. Options page field for editing the template, with the default pre-filled and a live preview.
3. Wire into Sync Engine's `putFile` call.

---

## Phase 7 — Retry Queue

1. `storage` already has a `queue` namespace (Phase 1). On any `putFile` failure in Phase 4, push `{ problemId, reason, timestamp }`.
2. Background worker: on extension startup and on a periodic alarm (`chrome.alarms`, e.g. every 5 min), attempt to flush the queue — re-run the sync for each queued item.
3. Respect GitHub rate-limit headers (`X-RateLimit-Reset`) — don't hammer retries into an active rate limit.
4. Remove from queue on success; cap retry attempts (e.g. 5) and surface permanently-failed items in the popup log rather than retrying forever silently.

---

## Phase 8 — Popup UI

1. Dashboard: today's sync log (✔/✖ with reasons, per PRD), quick stats, manual "Sync Current Problem" button (re-runs extraction on the currently open tab if it's a LeetCode submission page).
2. Wire to the storage layer read-only for logs/stats, and to the Sync Engine for the manual trigger.
3. Keep this thin — no business logic in the UI layer, it only reads storage and dispatches messages to the background worker.

---

## Phase 9 — Options / Settings Page

1. Repository setup screen: PAT input, repo picker/confirm, "Test Connection" button (calls Phase 2's `testConnection`).
2. Folder structure selector, commit template editor (Phase 6), README toggle.
3. Repository manager: change/disconnect/switch repo.
4. Persist all to `Settings` via Phase 1's storage wrapper.

**Checkpoint:** full first-run flow works end to end — install, enter PAT, pick repo, pick folder structure, solve a problem, see it synced, see it in the popup log.

---

## Phase 10 — Error Handling Pass

Go back through Phases 2–7 and make sure every case in the PRD's error table is actually handled, not just the happy path:

- Rate limit → retry (Phase 7 covers this — verify).
- Network failure → queue (verify offline behavior specifically, e.g. laptop sleep mid-sync).
- Repository deleted → detect via 404 on next sync, surface a clear "reconnect repository" notification rather than silent retry-forever.
- Invalid token → detect via 401, prompt reconnect in popup, don't just log and drop.

---

## Phase 11 — Sync Past Submissions

1. Implement GraphQL/API scraping to fetch all previously "Accepted" submissions from LeetCode.
2. Inject scraping script into a foreground tab to securely use CSRF cookies.
3. Batch queue these historical solutions through the `sync-engine` to prevent duplicate spam and handle rate limiting gracefully.

---

## Phase 12 — Multi Platform Support

1. Refactor or extend `PlatformAdapter` to handle sites like GeeksForGeeks or HackerRank.
2. Implement specific `GeeksForGeeksAdapter` including DOM observation and code extraction.
3. Update Options UI so users can select which platforms to sync from.

---

## Phase 13 — QA Pass

1. Manual test matrix: multiple languages, all 3 difficulties, all 4 folder structures, re-submission (duplicate + version-bump paths), rate-limit simulation (mock 403 response), token revocation mid-session.
2. Memory/perf sanity check — nothing in this PRD's original targets was load-bearing, but do confirm the popup doesn't lag and the content script isn't leaking listeners on SPA navigation (LeetCode is a SPA — watch for content script re-injection issues across problem navigations).
3. Fresh-profile install test — the exact first-run flow a new user hits, no dev-console assists.

---

## Phase 14 — Chrome Web Store Packaging

1. Write the store listing emphasizing the security model (fine-grained PAT, single repo, no OAuth, no telemetry) — this is your actual differentiator, lead with it.
2. Privacy policy page (even a static one) — required for Web Store listing, and directly reinforces the trust positioning from your Guiding Philosophy section.
3. Icons, screenshots, promotional tile.
4. Submit for review; MV3 extensions with `storage` + host permissions to `github.com`/`leetcode.com` typically get flagged for manual review — expect a review cycle, not instant approval.

---

## Suggested build order recap

```
Phase 0  → scaffolding
Phase 1  → storage layer
Phase 2  → GitHub client         ┐ build/test independently
Phase 3  → LeetCode adapter      ┘
Phase 4  → sync engine (joins 1+2+3)
Phase 5  → README generator
Phase 6  → commit templating
Phase 7  → retry queue
Phase 8  → GitHub Actions CI
Phase 9  → popup UI
Phase 10 → options page
Phase 11 → sync past submissions
Phase 12 → multi platform support
Phase 13 → error handling & QA
Phase 14 → Web Store packaging
```

Phases 2 and 3 can be built in parallel (or in either order) since neither depends on the other — they only meet at Phase 4. Everything from Phase 5 onward is strictly sequential.