# Current Focus

Phase 4 — Sync Engine
- Build `background/sync-engine.ts`.
- Orchestrate data flow from Content Script -> Sync Engine -> GitHub.
- Implement path resolution based on Settings.
- Implement duplicate detection (hash code).
- Implement version suffixing (`_vN`).
- Call `github/client.ts`'s `putFile`.
- Log success/failures using `storage/db.ts`.
