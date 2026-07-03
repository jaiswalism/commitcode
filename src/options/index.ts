import { db } from '../storage/db';
import { GitHubClient } from '../github/client';
import { FolderStructure } from '../storage/types';

document.addEventListener('DOMContentLoaded', async () => {
  const patInput = document.getElementById('pat') as HTMLInputElement;
  const repoInput = document.getElementById('repo') as HTMLInputElement;
  const folderStructureSelect = document.getElementById('folder-structure') as HTMLSelectElement;
  const versionModeSelect = document.getElementById('version-mode') as HTMLSelectElement;
  const commitTemplateInput = document.getElementById('commit-template') as HTMLTextAreaElement;

  const testBtn = document.getElementById('test-connection-btn') as HTMLButtonElement;
  const testStatus = document.getElementById('test-status') as HTMLSpanElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const saveStatus = document.getElementById('save-status') as HTMLSpanElement;

  const setupModalBtn = document.getElementById('open-setup-modal') as HTMLButtonElement;
  const setupModal = document.getElementById('setup-modal') as HTMLDivElement;
  const setupModalClose = document.getElementById('setup-modal-close') as HTMLSpanElement;

  const openSetupModal = () => {
    setupModal.style.display = 'flex';
  };

  const closeSetupModal = () => {
    setupModal.style.display = 'none';
  };

  setupModalBtn.addEventListener('click', openSetupModal);
  setupModalClose.addEventListener('click', closeSetupModal);
  setupModal.addEventListener('click', (e) => {
    if (e.target === setupModal) closeSetupModal();
  });

  const settings = await db.getSettings();
  if (settings.pat) patInput.value = settings.pat;
  if (settings.repository) repoInput.value = settings.repository;
  if (settings.folderStructure) folderStructureSelect.value = settings.folderStructure;
  if (settings.versionMode) versionModeSelect.value = settings.versionMode;
  if (settings.commitTemplate) commitTemplateInput.value = settings.commitTemplate;

  // Auto-open modal if no PAT or repo is set
  if (!settings.pat || !settings.repository) {
    openSetupModal();
  }

  let connectionTestedAndPassed = false;

  const showStatus = (element: HTMLSpanElement, message: string, isError = false) => {
    element.textContent = message;
    element.className = `status-text ${isError ? 'status-error' : 'status-success'}`;
    setTimeout(() => { element.textContent = ''; }, 5000);
  };

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
    // Remove any trailing slashes or subpaths
    const parts = repo.split('/');
    if (parts.length >= 2) {
      repo = `${parts[0]}/${parts[1]}`;
    }
    return repo;
  };

  repoInput.addEventListener('blur', () => {
    repoInput.value = cleanRepoInput(repoInput.value);
  });

  testBtn.addEventListener('click', async () => {
    const pat = patInput.value.trim();
    const repo = cleanRepoInput(repoInput.value);
    repoInput.value = repo;
    
    if (!pat || !repo) {
      showStatus(testStatus, 'Please enter both PAT and Repository.', true);
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    testStatus.textContent = '';

    try {
      const client = new GitHubClient(pat, repo);
      await client.testConnection();
      showStatus(testStatus, 'Connection successful!');
      connectionTestedAndPassed = true;
    } catch (e: any) {
      showStatus(testStatus, `Connection failed: ${e.message}`, true);
      connectionTestedAndPassed = false;
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  });

  saveBtn.addEventListener('click', async () => {
    const pat = patInput.value.trim();
    const repo = cleanRepoInput(repoInput.value);
    repoInput.value = repo;
    const folderStructure = folderStructureSelect.value as FolderStructure;
    const versionMode = versionModeSelect.value as 'versioned' | 'overwrite';
    const commitTemplate = commitTemplateInput.value.trim() || "Solved: {title}\nDifficulty: {difficulty}\nLanguage: {language}\nRuntime: {runtime}";

    const needsTest = (pat !== settings.pat || repo !== settings.repository);
    if (needsTest && !connectionTestedAndPassed) {
      showStatus(saveStatus, 'Please test the connection first before saving.', true);
      return;
    }

    try {
      saveBtn.disabled = true;
      await db.updateSettings({
        pat,
        repository: repo,
        folderStructure,
        versionMode,
        commitTemplate
      });
      
      settings.pat = pat;
      settings.repository = repo;
      settings.folderStructure = folderStructure;
      settings.versionMode = versionMode;
      settings.commitTemplate = commitTemplate;
      
      showStatus(saveStatus, 'Settings saved successfully!');
    } catch (e: any) {
      showStatus(saveStatus, `Failed to save: ${e.message}`, true);
    } finally {
      saveBtn.disabled = false;
    }
  });
});
