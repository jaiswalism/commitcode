import { LeetCodeAdapter } from '../platforms/leetcode/adapter';

console.log('[CommitCode] Content script loaded on', window.location.href);

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  duration?: number;
  link?: { url: string; label: string };
}

const TOAST_COLORS: Record<ToastVariant, string> = {
  success: '#22c55e', // green-500
  error: '#ef4444',   // red-500
  info: '#3b82f6',    // blue-500
};

function showToast(message: string, variant: ToastVariant = 'error', options: ToastOptions = {}) {
  const { duration = 3500, link } = options;

  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.backgroundColor = TOAST_COLORS[variant];
  toast.style.color = 'white';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.zIndex = '999999';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.maxWidth = '360px';
  toast.style.transition = 'opacity 0.3s ease';

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (link) {
    toast.appendChild(document.createElement('br'));
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    anchor.style.color = 'white';
    anchor.style.textDecoration = 'underline';
    anchor.style.fontSize = '13px';
    toast.appendChild(anchor);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'PUSH_SUCCESS') {
    const { slug, repo, commitUrl } = message.payload || {};
    const target = repo ? `${repo}/${slug}` : slug;
    showToast(`Synced to GitHub — ${target}`, 'success', {
      link: commitUrl ? { url: commitUrl, label: 'View commit' } : undefined,
    });
  }

  if (message.type === 'PUSH_FAILURE') {
    const { error } = message.payload || {};
    showToast(`Push failed: ${error || 'Unknown error'}`, 'error');
  }
});

const adapter = new LeetCodeAdapter();
adapter.startListening((problem) => {
  console.log('[CommitCode] Sending problem to Sync Engine:', problem);
  try {
    chrome.runtime.sendMessage({ type: 'SYNC_PROBLEM', problem }).catch((e) => {
      console.warn('[CommitCode] Failed to send message:', e);
      showToast('CommitCode: Extension was updated. Please refresh the page to continue syncing.', 'error', { duration: 5000 });
    });
  } catch (e) {
    console.warn('[CommitCode] Extension context invalidated:', e);
    showToast('CommitCode: Extension was updated. Please refresh the page to continue syncing.', 'error', { duration: 5000 });
  }
});
