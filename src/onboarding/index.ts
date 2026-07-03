import { db } from '../storage/db';
import { GitHubClient } from '../github/client';
import { FolderStructure } from '../storage/types';

document.addEventListener('DOMContentLoaded', () => {
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3')
  ];
  const currentStepIndicator = document.getElementById('current-step');
  
  let currentStepIndex = 0;

  function showStep(index: number) {
    steps.forEach((step, i) => {
      if (step) {
        if (i === index) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      }
    });
    if (currentStepIndicator) {
      currentStepIndicator.textContent = (index + 1).toString();
    }
  }

  const appVersion = document.getElementById('app-version');
  if (appVersion && chrome.runtime && chrome.runtime.getManifest) {
    appVersion.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  const btnNext1 = document.getElementById('btn-next-1');
  if (btnNext1) {
    btnNext1.addEventListener('click', () => {
      currentStepIndex = 1;
      showStep(currentStepIndex);
    });
  }

  let connectionTestedAndPassed = false;

  const btnNext2 = document.getElementById('btn-next-2');
  if (btnNext2) {
    btnNext2.addEventListener('click', () => {
      currentStepIndex = 2;
      showStep(currentStepIndex);
    });
  }

  const btnSkip2 = document.getElementById('btn-skip-2');
  if (btnSkip2) {
    btnSkip2.addEventListener('click', () => {
      currentStepIndex = 2;
      showStep(currentStepIndex);
    });
  }

  const btnTest = document.getElementById('btn-test') as HTMLButtonElement;
  const testStatus = document.getElementById('test-status');
  const patInput = document.getElementById('pat') as HTMLInputElement;
  const repoInput = document.getElementById('repo') as HTMLInputElement;
  
  const cleanRepoInput = (input: string) => {
    let repo = input.trim();
    if (repo.startsWith('https://github.com/')) {
      repo = repo.substring('https://github.com/'.length);
    } else if (repo.startsWith('http://github.com/')) {
      repo = repo.substring('http://github.com/'.length);
    } else if (repo.startsWith('github.com/')) {
      repo = repo.substring('github.com/'.length);
    }
    if (repo.endsWith('.git')) {
      repo = repo.substring(0, repo.length - 4);
    }
    const parts = repo.split('/');
    if (parts.length >= 2) {
      repo = `${parts[0]}/${parts[1]}`;
    }
    return repo;
  };

  if (repoInput) {
    repoInput.addEventListener('blur', () => {
      repoInput.value = cleanRepoInput(repoInput.value);
    });
  }

  if (btnTest && testStatus && patInput && repoInput) {
    btnTest.addEventListener('click', async () => {
      const pat = patInput.value.trim();
      const repo = cleanRepoInput(repoInput.value);
      repoInput.value = repo;

      if (!pat || !repo) {
        testStatus.textContent = 'Please enter both PAT and Repository';
        testStatus.style.color = '#f87171'; // red-400
        return;
      }
      
      btnTest.textContent = 'Testing...';
      btnTest.disabled = true;
      testStatus.textContent = '';
      
      try {
        const client = new GitHubClient(pat, repo);
        await client.testConnection();
        testStatus.textContent = '✓ Connection successful';
        testStatus.style.color = '#34d399'; // emerald-400
        connectionTestedAndPassed = true;
      } catch (e: any) {
        testStatus.textContent = `Connection failed: ${e.message}`;
        testStatus.style.color = '#f87171'; // red-400
        connectionTestedAndPassed = false;
      } finally {
        btnTest.textContent = 'Test Connection';
        btnTest.disabled = false;
      }
    });
  }

  const btnFinish = document.getElementById('btn-finish') as HTMLButtonElement;
  const folderStructureSelect = document.getElementById('folder-structure') as HTMLSelectElement;
  
  if (btnFinish) {
    btnFinish.addEventListener('click', async () => {
      // Save settings and close or redirect
      btnFinish.textContent = 'Saving...';
      btnFinish.disabled = true;
      
      const pat = patInput ? patInput.value.trim() : '';
      const repo = repoInput ? repoInput.value.trim() : '';
      const folderStructure = (folderStructureSelect ? folderStructureSelect.value : 'Difficulty') as FolderStructure;
      
      try {
        const updates: Partial<Parameters<typeof db.updateSettings>[0]> = {
          folderStructure
        };
        
        if (pat && repo && connectionTestedAndPassed) {
          updates.pat = pat;
          updates.repository = repo;
        }

        await db.updateSettings(updates);
        
        btnFinish.textContent = 'Done!';
        
        setTimeout(() => {
          window.location.href = '../options/index.html';
        }, 500);
      } catch (e) {
        console.error('Failed to save settings:', e);
        btnFinish.textContent = 'Error';
        btnFinish.style.backgroundColor = '#f87171';
        btnFinish.disabled = false;
      }
    });
  }
});
