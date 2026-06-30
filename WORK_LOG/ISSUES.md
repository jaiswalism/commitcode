# Known Issues

This file documents any bugs, operational challenges, or technical debt discovered during development.

## 2026-07-02

- **Double-firing Risk on SPA Navigation**: In `platforms/leetcode/adapter.ts`, LeetCode's SPA architecture means `window` persists across navigations. If `startListening()` is re-triggered, duplicate `message` listeners and `fetch` patches could cause double-firing. 
  - *Resolution*: Added idempotent injection guards (`__COMMITCODE_INJECTED` and `__COMMITCODE_FETCH_WRAPPED`) to ensure the patch only applies once.
- **GitHub Client Manual Testing**: `putFile()` logic requires manual testing for 409 SHA conflicts since no PAT is configured in the dev environment. A throwaway script is available at `scratch/github-test.ts` for manual execution.
- **Missing Content Script Entry Point**: The LeetCode adapter was fully written but never actually injected into the page because `src/content/index.ts` didn't exist and `content_scripts` was missing from `manifest.json`.
  - *Resolution*: Created `src/content/index.ts` with top-level console logs and registered it in `manifest.json` under `https://leetcode.com/problems/*`.
- **Content Security Policy (CSP) Blocker**: Injecting the fetch interceptor inline via a `<script>` tag was blocked by LeetCode's strict CSP preventing `unsafe-inline`.
  - *Resolution*: Adopted MV3 best practice. Added a background service worker with `"scripting"` permission and updated the adapter to send an `INJECT_INTERCEPTOR` message. The background worker uses `chrome.scripting.executeScript` targeting `{ world: 'MAIN' }` to install the interceptor cleanly.
  - *Follow-up*: Required adding `"host_permissions": ["https://leetcode.com/*"]` to `manifest.json` because `chrome.scripting.executeScript` requires explicit host permissions.
