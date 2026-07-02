import { GitHubClient, GitHubError } from '../src/github/client';

async function runTest() {
  const pat = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_REPO; // e.g. "username/repo"

  if (!pat || !repo) {
    console.error("Please provide GITHUB_PAT and GITHUB_REPO environment variables.");
    process.exit(1);
  }

  const client = new GitHubClient(pat, repo);
  const testPath = 'test-file.txt'; // Root level

  try {
    console.log(`1. Testing connection to ${repo}...`);
    await client.testConnection();
    console.log("Connection successful!");

    console.log(`\n2. Creating file at ${testPath}...`);
    const initialContent = "Hello CommitCode (V1) - " + Date.now();
    await client.putFile(testPath, initialContent, "chore: create test file");
    console.log("File created successfully.");

    console.log(`\n3. Fetching file to get current SHA...`);
    const file = await client.getFile(testPath);
    console.log("File fetched. SHA:", file.sha);

    console.log(`\n4. Updating file with correct SHA...`);
    const updatedContent = "Hello CommitCode (V2) - " + Date.now();
    await client.putFile(testPath, updatedContent, "chore: update test file", file.sha);
    console.log("File updated successfully.");

    console.log(`\n5. Testing 409 Conflict handling (stale SHA)...`);
    try {
      await client.putFile(testPath, "This should fail", "chore: conflicting update", file.sha); // using the old SHA from step 3
      console.error("ERROR: The update should have failed with a 409 conflict, but it succeeded!");
    } catch (e: any) {
      if (e instanceof GitHubError && e.status === 409) {
        console.log("SUCCESS: Caught 409 Conflict error as expected!");
        console.log("Error message:", e.message);
      } else {
        console.error("ERROR: Expected 409 Conflict, got something else:", e);
      }
    }

  } catch (err) {
    console.error("Test failed:", err);
  }
}

runTest();
