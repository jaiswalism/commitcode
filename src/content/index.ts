import { LeetCodeAdapter } from '../platforms/leetcode/adapter';

console.log('[CommitCode] Content script loaded on', window.location.href);

const adapter = new LeetCodeAdapter();
adapter.startListening((problem) => {
  console.log('[CommitCode] Sending problem to Sync Engine:', problem);
  chrome.runtime.sendMessage({ type: 'SYNC_PROBLEM', problem });
});
