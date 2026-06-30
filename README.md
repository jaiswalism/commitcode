# CommitCode

A privacy-focused Chrome Extension that automatically syncs your LeetCode submissions directly to your own GitHub repository.

## Features
- **Zero Third-Party Servers**: Connects directly to GitHub via their official REST API. No intermediate servers, no data harvesting.
- **Fine-Grained Access**: Uses modern GitHub fine-grained Personal Access Tokens limited *strictly* to a single repository of your choosing.
- **Flexible Folder Structures**: Organize your solutions by Difficulty, Topic, Language, Problem Number, or Flat.
- **Duplicate Detection**: Intelligently hashes your code to prevent spamming your repo with identical submissions.
- **Smart Versioning**: Optionally keep a history of your attempts (e.g., `_v1`, `_v2`) or overwrite in place.
- **Auto-generated README**: Automatically maintains a gorgeous markdown table and difficulty stats right in your repo.
- **File Headers**: Automatically prepends metadata (Title, Difficulty, Runtime, Memory, URL) to every uploaded file.

## Setup
1. Create a NEW, empty repository on GitHub (e.g., `leetcode-solutions`).
2. Generate a Fine-Grained Personal Access Token (Settings -> Developer Settings).
3. Grant it **Contents: Read and Write** specifically for that one new repository.
4. Install CommitCode in Chrome, enter your token and repo, and solve a problem!

## Privacy Guarantee
Your code, token, and stats stay strictly between your browser and GitHub. We don't track you.

## License and Attribution
This project is open-source under the **MIT License**. 

You are free to use, copy, modify, and distribute this software, **provided that you give explicit credit to the original author (Shyam Jaiswal)**. The original copyright notice and permission notice must be included in all copies or substantial portions of the software.
