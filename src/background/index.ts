import { SyncEngine } from './sync-engine';

const engine = new SyncEngine();

export function injectFetchInterceptorInMainWorld() {
  if ((window as any).__COMMITCODE_FETCH_WRAPPED) {
    console.log('[CommitCode] injection skipped, already active (fetch)');
    return;
  }
  (window as any).__COMMITCODE_FETCH_WRAPPED = true;
  
  (window as any).__COMMITCODE_CODE_CACHE = (window as any).__COMMITCODE_CODE_CACHE || {};

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let requestBody: string | null = null;
    let isSubmitUrl = false;
    
    const urlObj = args[0] instanceof Request ? args[0] : null;
    const urlStr = urlObj ? urlObj.url : args[0];
    
    if (typeof urlStr === 'string' && /\/problems\/.*\/submit\//.test(urlStr)) {
      isSubmitUrl = true;
      try {
        if (urlObj) {
          requestBody = await urlObj.clone().text();
        } else if (args[1] && args[1].body) {
          requestBody = typeof args[1].body === 'string' ? args[1].body : null; 
        }
      } catch (e) {
        console.error('[CommitCode] Failed to read submit body', e);
      }
    }

    const response = await originalFetch.apply(this, args);
    
    if (isSubmitUrl && requestBody) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data && data.submission_id) {
          try {
            const parsed = JSON.parse(requestBody!);
            if (parsed && parsed.typed_code) {
              (window as any).__COMMITCODE_CODE_CACHE[data.submission_id] = parsed.typed_code;
              console.log(`[CommitCode] Cached code for submission_id: ${data.submission_id}, length: ${parsed.typed_code.length} chars`);
            }
          } catch (e) {}
        }
      }).catch(() => {});
    }

    if (typeof urlStr === 'string' && /\/submissions\/detail\/\d+\/v2\/check/.test(urlStr)) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data && data.submission_id) {
          const cachedCode = (window as any).__COMMITCODE_CODE_CACHE[data.submission_id];
          if (cachedCode) {
            data.cached_code = cachedCode;
          }
        }
        window.postMessage({ type: 'COMMITCODE_SUBMISSION', data }, '*');
      }).catch(err => console.error('CommitCode parse error:', err));
    }
    return response;
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[CommitCode] Background received message:', message);
  if (message.type === 'SYNC_PROBLEM' && message.problem) {
    engine.sync(message.problem);
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'INJECT_INTERCEPTOR' && sender.tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: injectFetchInterceptorInMainWorld
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      console.error('[CommitCode] Script injection failed:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async sendResponse
  }
});
