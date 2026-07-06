import { LeetCodeAdapter } from '../platforms/leetcode/adapter';

console.log('[CommitCode] Content script loaded on', window.location.href);

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.backgroundColor = '#ef4444'; // red-500
  toast.style.color = 'white';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.zIndex = '999999';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.transition = 'opacity 0.3s ease';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

const adapter = new LeetCodeAdapter();
adapter.startListening((problem) => {
  console.log('[CommitCode] Sending problem to Sync Engine:', problem);
  try {
    chrome.runtime.sendMessage({ type: 'SYNC_PROBLEM', problem }).catch((e) => {
      console.warn('[CommitCode] Failed to send message:', e);
      showToast('CommitCode: Extension was updated. Please refresh the page to continue syncing.');
    });
  } catch (e) {
    console.warn('[CommitCode] Extension context invalidated:', e);
    showToast('CommitCode: Extension was updated. Please refresh the page to continue syncing.');
  }
});
