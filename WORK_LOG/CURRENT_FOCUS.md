# Current Focus

Phase 6 — Commit Templating
- Implement customizable commit messages.
- Allow users to define a template (e.g. `[{difficulty}] {title} ({runtime}, {memory})`).
- Update `SyncEngine` to use this template when calling `github/client.ts` `putFile`.
