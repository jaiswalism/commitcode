import { PlatformAdapter } from '../types';
import { ProblemRecord } from '../../storage/types';

export class LeetCodeAdapter implements PlatformAdapter {
  private observer: MutationObserver | null = null;
  private onSubmission: ((problem: ProblemRecord) => void) | null = null;

  startListening(onSubmissionDetected: (problem: ProblemRecord) => void): void {
    console.log('[CommitCode] adapter injected on ' + window.location.href);
    this.onSubmission = onSubmissionDetected;
    
    // For MV3 content script, we can inject a script to monkey-patch fetch/XHR,
    // or we can use DOM observation. Let's start with a DOM observer that looks
    // for the 'Accepted' status on the submission page.
    this.observer = new MutationObserver(() => this.checkForSubmission());
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also inject a fetch interceptor via a script tag to get the raw code 
    // and stats directly from the API response if possible.
    this.injectFetchInterceptor();
  }

  stopListening(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    window.removeEventListener('message', this.handleMessage);
  }

  private injectFetchInterceptor(): void {
    if ((window as any).__COMMITCODE_INJECTED) {
      console.log('[CommitCode] injection skipped, already active');
      return;
    }
    (window as any).__COMMITCODE_INJECTED = true;

    window.addEventListener('message', this.handleMessage);

    // Request background script to inject into MAIN world
    chrome.runtime.sendMessage({ type: 'INJECT_INTERCEPTOR' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[CommitCode] Message to background failed:', chrome.runtime.lastError.message);
      } else if (!response?.success) {
        console.error('[CommitCode] Injection failed:', response?.error);
      } else {
        console.log('[CommitCode] Background successfully injected interceptor');
      }
    });
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.source !== window || !event.data || event.data.type !== 'COMMITCODE_SUBMISSION') {
      return;
    }
    
    const data = event.data.data;
    console.log('[CommitCode] intercepted raw response:', data);
    
    if (data.finished !== true) {
      return;
    }

    if (data.status_msg !== 'Accepted') {
      return;
    }

    console.log('[CommitCode] detected submission:', data);
    
    // Extract slug from URL to fetch accurate metadata
    const match = window.location.pathname.match(/\/problems\/([^\/]+)/);
    const slug = match ? match[1] : null;

    if (this.onSubmission) {
      if (slug) {
        console.log(`[CommitCode] Attempting GraphQL fetch for slug: ${slug}`);
        this.fetchProblemMetadata(slug).then(async meta => {
          if (meta) {
            console.log('[CommitCode] GraphQL metadata fetched:', meta);
          } else {
            console.log('[CommitCode] GraphQL failed, falling back to DOM scraping and internal IDs');
          }

          let code = data.cached_code || '';
          if (code) {
            console.log(`[CommitCode] code captured: ${code.length} chars`);
          } else {
            console.log(`[CommitCode] no cached code found for submission_id ${data.submission_id}, falling back to GraphQL`);
            const fetchedCode = await this.fetchSubmissionCode(data.submission_id);
            if (fetchedCode) {
              code = fetchedCode;
              console.log(`[CommitCode] code captured via GraphQL: ${code.length} chars`);
            } else {
              console.warn('[CommitCode] Failed to capture code completely!');
            }
          }

          this.onSubmission!({
            id: meta?.questionFrontendId || data.question_id || data.submission_id,
            title: meta?.title || document.title.split('-')[0].trim() || 'Unknown Problem',
            difficulty: (meta?.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Easy',
            language: data.pretty_lang || data.lang,
            runtime: data.status_runtime,
            memory: data.status_memory,
            submissionTime: Date.now(),
            code: code,
            url: window.location.href,
            version: 1,
          } as ProblemRecord);
        });
      } else {
        // Fallback if URL parsing fails
        const completeFallback = async () => {
          let code = data.cached_code || '';
          if (code) {
            console.log(`[CommitCode] code captured: ${code.length} chars`);
          } else {
            console.log(`[CommitCode] no cached code found for submission_id ${data.submission_id}, falling back to GraphQL`);
            const fetchedCode = await this.fetchSubmissionCode(data.submission_id);
            if (fetchedCode) {
              code = fetchedCode;
              console.log(`[CommitCode] code captured via GraphQL: ${code.length} chars`);
            } else {
              console.warn('[CommitCode] Failed to capture code completely!');
            }
          }
          this.onSubmission!({
            id: data.question_id || data.submission_id,
            title: document.title.split('-')[0].trim() || 'Unknown Problem',
            difficulty: 'Easy',
            language: data.pretty_lang || data.lang,
            runtime: data.status_runtime,
            memory: data.status_memory,
            submissionTime: Date.now(),
            code: code,
            url: window.location.href,
            version: 1,
          } as ProblemRecord);
        };
        completeFallback();
      }
    }
  };

  private async fetchProblemMetadata(slug: string) {
    try {
      const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionFrontendId
            title
            difficulty
          }
        }
      `;
      const csrf = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
      
      const payload = {
        query,
        variables: { titleSlug: slug }
      };
      
      console.log(`[CommitCode] Sending GraphQL request for ${slug} with payload:`, payload);

      const res = await fetch('https://leetcode.com/graphql/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrf
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`[CommitCode] GraphQL response status: ${res.status}`);
      const rawText = await res.text();
      console.log(`[CommitCode] GraphQL raw response body:`, rawText);
      
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      
      const data = JSON.parse(rawText);
      return data.data?.question;
    } catch (e: any) {
      console.error(`[CommitCode] GraphQL failed, falling back: ${e.message || e}`);
      return null;
    }
  }

  private async fetchSubmissionCode(submissionId: number | string) {
    try {
      const query = `
        query submissionDetails($submissionId: Int!) {
          submissionDetails(submissionId: $submissionId) {
            code
          }
        }
      `;
      const csrf = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
      
      const payload = {
        query,
        variables: { submissionId: parseInt(submissionId as string, 10) }
      };
      
      const res = await fetch('https://leetcode.com/graphql/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrf
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      return data.data?.submissionDetails?.code;
    } catch (e: any) {
      console.error(`[CommitCode] GraphQL submissionDetails failed: ${e.message || e}`);
      return null;
    }
  }

  private checkForSubmission(): void {
    // Fallback: check DOM for 'Accepted' text and code editor contents
    // (Actual selectors would be needed here based on the current LeetCode UI)
  }
}
