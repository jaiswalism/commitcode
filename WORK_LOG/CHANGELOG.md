# Changelog

## 2026-07-03
- Rebranded extension from "LeetSync" to "CommitCode".
- Created `LICENSE` and completely rewrote `README.md` with detailed, image-backed setup instructions.
- Implemented Popup Dashboard and Options page (Phases 8 & 9) for user configuration.
- Wired content scripts to the background service worker.

## 2026-07-02
- Initialized CommitCode project scaffolding (Phase 0).
- Set up Vite, `@crxjs/vite-plugin`, and TypeScript configuration.
- Created MV3 `manifest.json`.
- Verified successful build.
- Implemented Storage Layer (Phase 1):
  - Created TS interfaces (`Settings`, `ProblemRecord`, `SyncLogEntry`, `RetryQueueItem`).
  - Wrapped `chrome.storage.local` with a typed API (`db.ts`).
- Implemented GitHub Client (Phase 2):
  - Added `GitHubClient` with methods for `testConnection`, `getFile`, `putFile`, and `listDirectory`.
  - Added explicit handling for 401, 403, 404, and 409 errors.
  - Created test script `scratch/github-test.ts` to verify 409 conflict logic.
- ## Completed Phases
- [x] Phase 1: Storage Layer (`src/storage`)
- [x] Phase 2: GitHub API Client (`src/github/client.ts`)
- [x] Phase 3: LeetCode Platform Adapter (`src/platforms/leetcode`)
- [x] Phase 4: Sync Engine (`src/background/sync-engine.ts`)
- [x] Phase 5: README Generator (`src/github/readme-generator.ts`)
- [x] Phase 6: Commit Templating & Batched Commits via Git Database API
- [x] Phase 8 & 9: Popup UI and Options Page (`src/popup`, `src/options`)
- [x] Rebranding & Git History Rewrite: Renamed project to CommitCode, rebuilt Git history, expanded `README.md`.
### Details
**Phase 4: Sync Engine**
- Implemented `SyncEngine` with automatic problem code hashing (SHA-256) for duplicate detection.
- Added version suffixing logic (e.g. `_v1`, `_v2`) using directory listing.
- Wired content script to forward extracted `ProblemRecord`s to the background script via `chrome.runtime.sendMessage`.
- Implemented retry queue and sync logging on failures.

- Implemented LeetCode Platform Adapter (Phase 3):
  - Created `PlatformAdapter` interface.
  - Built `LeetCodeAdapter` with fetch interceptor and mutation observer.
  - Patched SPA double-injection issue with idempotent guards.
  - Wired adapter up by creating `src/content/index.ts` and registering it in `manifest.json`.
  - Refined fetch interceptor to match `/submissions/detail/.../v2/check/` polling endpoint.
  - Refined fetch interceptor to match `/submissions/detail/.../v2/check/` polling endpoint.
  - Added filtering logic to only detect when `finished === true` and `status_msg === "Accepted"`.
  - Refactored page-context injection to bypass CSP using `chrome.scripting.executeScript({ world: 'MAIN' })` from the background script.
  - Integrated LeetCode GraphQL API fetching to accurately extract `questionFrontendId`, `title`, and `difficulty` metadata on the fly.
  - Implemented `extractCode()` by intercepting the outgoing `/submit/` request, caching the body in `window.__COMMITCODE_CODE_CACHE`, and falling back to a GraphQL `submissionDetails` query if the cache misses.
