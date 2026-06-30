# CommitCode
### Product Requirements Document (PRD)

**Version:** 1.1
**Author:** Shyam Jaiswal
**Status:** Draft
**Target Platform:** Chrome (Manifest V3), Firefox (Future)
**Repository Visibility:** Public
**License:** MIT

---

# 1. Vision

CommitCode is a privacy-first browser extension that automatically syncs accepted coding problem submissions from coding platforms like LeetCode to GitHub.

Unlike existing solutions, CommitCode prioritizes:

- Minimal permissions
- Transparent security
- Reliability
- Customization
- Open-source architecture
- Zero telemetry

The goal is to become the most trusted and feature-rich coding sync extension available.

---

# 2. Problem Statement

Current solutions suffer from several issues:

## Security

- GitHub OAuth requests access to ALL repositories.
- Private repositories become accessible.
- Organization repositories may also become accessible.
- Users cannot limit permissions.

## Reliability

LeetCode frequently updates its UI.

Existing extensions often break whenever:

- DOM changes
- CSS selectors change
- Submission page changes

Users lose weeks or months of submissions.

## Lack of Customization

Current solutions offer very few options.

Users cannot easily customize:

- Folder structure
- Commit messages
- Repository organization
- Version history
- README generation

---

# 3. Goals

**Primary Goals**

✅ Privacy-first
✅ Reliable syncing
✅ Open Source
✅ One-click setup
✅ Minimal GitHub permissions

**Secondary Goals**

- Multi-platform support
- Beautiful UI
- Analytics dashboard
- Study companion

---

# 4. Non-Goals (V1)

- Backend server
- Cloud storage
- User accounts
- Paid plans
- AI code generation
- Mobile application
- Formal accessibility audit (standard semantic HTML / keyboard-operable popup is table stakes, not a tracked feature)

---

# 5. Core Principles

## Security First

The extension should never request permissions it does not need.

## Local First

All processing happens inside the browser. No external server.

## Open Source

Every line of code should be auditable.

## Modular

Every coding platform should be implemented as a plugin.

---

# 6. User Personas

## Student / Job Seeker

**Needs**

- GitHub portfolio, consistent contribution history
- Organized repository
- Automatic uploads without needing to know Git

**Pain Points**

- Forgets to upload solutions
- Doesn't know Git

## Competitive Programmer / Privacy-Conscious Developer

**Needs**

- Version history, multiple languages, tags, notes
- No OAuth, no tracking, fine-grained GitHub access

---

# 7. Feature List (V1)

### Automatic Sync

Detect accepted submissions. Automatically upload solution.

---

### Repository Selection

User selects repository once. No repository creation required.

---

### GitHub Fine-Grained PAT

Instead of OAuth, use:

- Repository Access: Only Selected Repository
- Permissions: Contents — Read & Write. Nothing else.

---

### README Generator

Automatically update README after every solve. Include:

- Total solved
- Difficulty counts
- Language
- Date solved
- Table of problems

---

### Commit Generator

Default:

```
Solved: Two Sum
Difficulty: Easy
Language: Java
Runtime: 0ms
```

Users can customize templates.

---

### Folder Structures

Users choose one organizing scheme:

| Scheme | Example |
|---|---|
| Difficulty | `Easy/`, `Medium/`, `Hard/` |
| Topic | `Arrays/`, `Graphs/`, `DP/`, `Trees/` |
| Language | `Java/`, `CPP/`, `Python/` |
| Problem Number | `0001/`, `0002/`, `0003/` |
| Flat | all files at repository root |

---

### Sync Logs

Every upload stored locally.

Example:

```
Today
✔ Two Sum
✔ Binary Search
✖ LRU Cache
  Reason: GitHub Rate Limit
```

---

### Retry Queue

Failed uploads stored locally. Retry automatically.

---

### Duplicate Detection

If nothing changed, skip upload.

---

### Manual Sync

Button: `Sync Current Problem`

---

### Version History

Every re-submission of a previously solved problem is uploaded as a new suffixed file — no overwrite, no user toggle:

```
Two Sum_v1.cpp
Two Sum_v2.cpp
Two Sum_v3.cpp
```

The suffix always increments from the last version found in the repository for that problem+language pair. README table links to the latest version by default.

---

### Repository Manager

Users can change repository, disconnect repository, or switch repositories.

---

# 8. V1.5 / V2 Features

## Import Existing History

Fetch all past accepted submissions and upload them retroactively, using the same `_v1`, `_v2` suffix scheme for any problem with multiple historical submissions.

*(Deferred from V1 — not required to prove the core detect → commit → README loop; adds meaningfully to initial scope and GitHub API load.)*

## Multi Platform

LeetCode, GeeksforGeeks, Codeforces, CodeChef, HackerRank, AtCoder

## Study Notes

Each problem gets a `notes.md` containing: Idea, Mistakes, Complexity, Revision Notes

## AI Explanation (Optional)

Generated and stored locally only.

## Statistics Dashboard

Charts for: problems solved, difficulty, topics, languages, acceptance rate, daily/weekly streak, monthly activity.

## Revision Planner

Remind users of problems not revisited in 30 / 60 / 90 days.

## Multi-language Solutions

Store the same problem solved in multiple languages (Java, Python, C++, Rust) side by side rather than as versions.

---

# 9. Security Requirements

## No OAuth

OAuth is intentionally avoided — it requires broad repository permissions. Instead: PAT → Single Repository → Contents Read & Write only.

## No Backend

No requests except to the GitHub API and the coding platform.

## No Analytics

No Google Analytics, no Mixpanel, no telemetry, no tracking.

## Token Storage

Encrypted, Chrome Storage API. Never transmitted.

## Network Transparency

Users can inspect every API request the extension makes.

---

# 10. Technical Architecture

```
Browser
 ├── Popup UI
 ├── Settings
 ├── Content Scripts
 ├── Background Worker
 ├── Storage
 └── GitHub Client
        ↓
   GitHub REST API
        ↓
    Repository
```

```
src/
 ├── background/
 ├── content/
 ├── github/
 ├── platforms/
 │    ├── leetcode/
 │    ├── gfg/
 │    └── codeforces/
 ├── storage/
 ├── utils/
 ├── popup/
 ├── options/
 └── assets/
```

---

# 11. Platform Adapter Architecture

Every platform implements:

```
interface PlatformAdapter {
  detectSubmission()
  extractProblem()
  extractCode()
  extractLanguage()
  extractDifficulty()
  extractMetadata()
}
```

---

# 12. Data Model

**Problem**

```
id, title, difficulty, language, runtime, memory,
submissionTime, tags, companyTags, code, url, version
```

**Settings**

```
repository, folderStructure, commitTemplate,
autoSync, readmeEnabled
```

*(`versionMode` removed — versioning is now always-on with auto-incrementing suffixes, not a user setting.)*

---

# 13. README Format

Header → Statistics → Table

| # | Problem | Difficulty | Language | Date | Version |
|---|----------|------------|-----------|------|---------|

---

# 14. UI Screens

## Welcome
Introduction, Security Promise, Setup

## Repository Setup
PAT, Repository, Test Connection

## Dashboard
Sync Status, Statistics, Logs

## Settings
Repository, Folder Structure, README, Commit Template, Retry Queue, Advanced

---

# 15. Error Handling

| Condition | Response |
|---|---|
| GitHub Rate Limit | Retry with backoff |
| Network Failure | Queue for retry |
| Repository Deleted | Notify user |
| Invalid Token | Prompt to reconnect |

---

# 16. Roadmap

**V1** — LeetCode, GitHub Sync, README, PAT, Logs, Retry Queue, Duplicate Detection, Version History (`_v1`/`_v2` suffixing)

**V1.5 / V2** — Import Existing History, Multiple Platforms, Statistics Dashboard, Study Notes, Revision Planner, Multi-language Solutions, AI Explanation

**V3 (not scoped)** — Plugin Marketplace, Self-hosted Sync, VS Code Companion, Mobile Companion — revisit after V2 ships, no commitments made in this document.

---

# 17. Competitive Advantages

| Existing Extensions | CommitCode |
|---|---|
| OAuth, broad permissions | Fine-Grained PAT, single repository |
| Limited customization | Fully configurable folder/commit/README |
| Few platforms | Plugin architecture |
| Minimal logging, no retry | Detailed logs + retry queue |
| Basic README | Rich, auto-updating README |
| Closed features | Fully open source |

---

# 18. Guiding Philosophy

CommitCode should be the extension developers trust without hesitation.

Every design decision should answer one question:

**"Does this improve user trust, security, or developer experience?"**

If not, it doesn't belong.