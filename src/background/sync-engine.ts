import { db } from '../storage/db';
import { ProblemRecord } from '../storage/types';
import { GitHubClient } from '../github/client';
import { ReadmeGenerator } from '../github/readme-generator';

export class SyncEngine {
  private getExtensionByLanguage(language: string): string {
    const map: Record<string, string> = {
      'cpp': 'cpp', 'c++': 'cpp', 
      'java': 'java', 
      'python': 'py', 'python3': 'py', 'python 3': 'py',
      'javascript': 'js', 
      'typescript': 'ts', 
      'csharp': 'cs', 'c#': 'cs', 
      'c': 'c',
      'ruby': 'rb', 
      'swift': 'swift', 
      'golang': 'go', 'go': 'go',
      'rust': 'rs',
      'kotlin': 'kt', 
      'php': 'php', 
      'scala': 'scala', 
      'mysql': 'sql', 'mssql': 'sql', 'oraclesql': 'sql', 'sql': 'sql'
    };
    return map[language.toLowerCase()] || 'txt';
  }

  private generateHeaderComment(problem: ProblemRecord): string {
    const ext = this.getExtensionByLanguage(problem.language);
    const dateStr = new Date(problem.submissionTime).toLocaleDateString();
    
    const lines = [
      `Problem: ${problem.title}`,
      `Difficulty: ${problem.difficulty}`,
      `Language: ${problem.language}`,
      `Date Solved: ${dateStr}`,
    ];
    if (problem.runtime) lines.push(`Runtime: ${problem.runtime}`);
    if (problem.memory) lines.push(`Memory: ${problem.memory}`);
    lines.push(`URL: ${problem.url}`);

    // Determine comment style based on extension
    if (['py', 'rb'].includes(ext)) {
      return lines.map(line => `# ${line}`).join('\n') + '\n\n';
    } else {
      return `/*\n${lines.map(line => ` * ${line}`).join('\n')}\n */\n\n`;
    }
  }

  private resolvePath(problem: ProblemRecord, version: number, structure: string, versionMode: 'versioned' | 'overwrite' = 'versioned'): string {
    // Format the title to be safe for filenames
    const paddedId = problem.id.toString().padStart(4, '0');
    const safeTitle = problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = this.getExtensionByLanguage(problem.language);
    const baseName = `${paddedId}-${safeTitle}`;
    const filename = versionMode === 'versioned' 
      ? `${baseName}_v${version}.${ext}`
      : `${baseName}.${ext}`;

    switch (structure) {
      case 'Difficulty':
        return `${problem.difficulty}/${filename}`;
      case 'Language':
        return `${problem.language}/${filename}`;
      case 'Number':
        const paddedId = problem.id.toString().padStart(4, '0');
        return `${paddedId}/${filename}`;
      case 'Flat':
        return filename;
      case 'Topic':
        return `${problem.difficulty}/${filename}`; // Topic not extracted yet
      default:
        return `${problem.difficulty}/${filename}`;
    }
  }

  private async hash(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async sync(problem: ProblemRecord) {
    try {
      const settings = await db.getSettings();
      
      const PAT = settings.pat;
      const REPO = settings.repository;
      const structure = settings.folderStructure;
      const versionMode = settings.versionMode;

      if (!PAT || !REPO) {
        console.error('[CommitCode] Sync failed: GitHub PAT or Repository not configured in Settings.');
        await db.pushToQueue({
          problemId: problem.id,
          reason: 'GitHub PAT or Repository not configured',
          timestamp: Date.now(),
        });
        await db.addLogEntry({
          problemId: problem.id,
          title: problem.title,
          timestamp: Date.now(),
          status: 'failure',
          reason: 'GitHub PAT or Repository not configured'
        });
        return;
      }

      // 2. Duplicate Detection
      const lastProblem = await db.getProblem(problem.id, problem.language);
      if (lastProblem && lastProblem.code) {
        const currentHash = await this.hash(problem.code);
        const lastHash = await this.hash(lastProblem.code);
        if (currentHash === lastHash) {
          console.log(`[CommitCode] Skipped sync for ${problem.id}: Code unchanged.`);
          await db.addLogEntry({
            problemId: problem.id,
            title: problem.title,
            timestamp: Date.now(),
            status: 'skipped',
            reason: 'Duplicate code'
          });
          return;
        }
      }

      const client = new GitHubClient(PAT, REPO);

      // 3. Version suffixing & GitHub update logic
      let version = 1;
      let targetPath = '';
      let shaToUpdate: string | undefined = undefined;

      if (versionMode === 'overwrite') {
        targetPath = this.resolvePath(problem, 1, structure, 'overwrite');
        const existingSha = await client.getFileSha(targetPath);
        if (existingSha) {
          shaToUpdate = existingSha;
        }
      } else {
        const v1Path = this.resolvePath(problem, 1, structure, 'versioned');
        const parts = v1Path.split('/');
        let directory = '';
        if (parts.length > 1) {
          directory = parts.slice(0, -1).join('/');
        }

        try {
          const files = await client.listDirectory(directory);
          const paddedId = problem.id.toString().padStart(4, '0');
          const safeTitle = problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const ext = this.getExtensionByLanguage(problem.language);
          const regex = new RegExp(`^${paddedId}-${safeTitle}_v(\\d+)\\.${ext}$`);
          
          let maxVersion = 0;
          for (const file of files) {
            const match = file.name.match(regex);
            if (match) {
              const v = parseInt(match[1], 10);
              if (v > maxVersion) maxVersion = v;
            }
          }
          version = maxVersion + 1;
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
        targetPath = this.resolvePath(problem, version, structure, 'versioned');
      }

      // 4. Generate header comment and upload
      const headerComment = this.generateHeaderComment(problem);
      const fullCode = headerComment + problem.code;
      let commitMsg = settings.commitTemplate;
      commitMsg = commitMsg.replace(/{title}/g, problem.title);
      commitMsg = commitMsg.replace(/{id}/g, problem.id);
      commitMsg = commitMsg.replace(/{difficulty}/g, problem.difficulty);
      commitMsg = commitMsg.replace(/{language}/g, problem.language);
      commitMsg = commitMsg.replace(/{runtime}/g, problem.runtime || 'N/A');
      commitMsg = commitMsg.replace(/{memory}/g, problem.memory || 'N/A');
      
      console.log(`[CommitCode] Uploading ${targetPath}...`);
      await client.putFile(targetPath, fullCode, commitMsg, shaToUpdate);

      // 5. On success
      problem.version = version;
      await db.saveProblem(problem);
      await db.addLogEntry({
        problemId: problem.id,
        title: problem.title,
        timestamp: Date.now(),
        status: 'success'
      });
      console.log(`[CommitCode] Successfully synced ${problem.id} to GitHub.`);

      // 6. Generate and push README
      const generator = new ReadmeGenerator();
      await generator.generateAndPush(client, settings);
      console.log(`[CommitCode] Successfully generated and pushed README.`);

    } catch (error: any) {
      console.error('[CommitCode] Sync failed:', error);
      
      // 7. On failure: push to retry queue
      await db.pushToQueue({
        problemId: problem.id,
        reason: error.message || 'Unknown network/API error',
        timestamp: Date.now(),
      });
      
      await db.addLogEntry({
        problemId: problem.id,
        title: problem.title,
        timestamp: Date.now(),
        status: 'failure',
        reason: error.message || 'Unknown network/API error'
      });
    }
  }
}
