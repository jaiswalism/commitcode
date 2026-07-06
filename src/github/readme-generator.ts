import { ProblemMetadata, Settings } from '../storage/types';

export class ReadmeGenerator {
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

  private resolvePath(problem: ProblemMetadata, settings: Settings): string {
    const paddedId = problem.id.toString().padStart(4, '0');
    const safeTitle = problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = this.getExtensionByLanguage(problem.language);

    // Default to version 1 if not set
    const version = problem.version || 1;

    const baseName = `${paddedId}-${safeTitle}`;
    const filename = settings.versionMode === 'versioned'
      ? `${baseName}_v${version}.${ext}`
      : `${baseName}.${ext}`;

    switch (settings.folderStructure) {
      case 'Difficulty':
        return `${problem.difficulty}/${filename}`;
      case 'Language':
        return `${problem.language}/${filename}`;
      case 'Number':
        const paddedIdFolder = problem.id.toString().padStart(4, '0');
        return `${paddedIdFolder}/${filename}`;
      case 'Flat':
        return filename;
      case 'Topic':
        return `${problem.difficulty}/${filename}`;
      default:
        return `${problem.difficulty}/${filename}`;
    }
  }

  public generate(settings: Settings, allProblems: ProblemMetadata[]): string {
    if (allProblems.length === 0) return '';

    let total = 0;
    let easy = 0;
    let medium = 0;
    let hard = 0;

    // Deduplicate by ID to get unique problems solved count
    const uniqueIds = new Set<string>();

    // Sort problems by ID
    const sorted = [...allProblems].sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idA - idB;
    });

    const rows: string[] = [];

    for (const p of sorted) {
      // Only count difficulty once per problem ID
      if (!uniqueIds.has(p.id)) {
        uniqueIds.add(p.id);
        if (p.difficulty === 'Easy') easy++;
        else if (p.difficulty === 'Medium') medium++;
        else if (p.difficulty === 'Hard') hard++;
      }

      const dateStr = new Date(p.submissionTime).toLocaleDateString();
      const path = this.resolvePath(p, settings);

      // Encode path for markdown link
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');

      rows.push(`| ${p.id} | [${p.title}](${p.url}) | ${p.difficulty} | [${p.language}](./${encodedPath}) | ${dateStr} |`);
    }

    total = uniqueIds.size;

    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = now.toLocaleString('en-US', { day: 'numeric', timeZone: 'UTC' });
    const year = now.toLocaleString('en-US', { year: 'numeric', timeZone: 'UTC' });
    const time = now.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

    const lastUpdated = `Last synced • ${month} ${day}, ${year} • ${time} UTC`;

    const markdown = `# LeetCode Solutions

Automatically synced by [CommitCode](https://github.com/jaiswalism/CommitCode) 

<div align="center">
  <img src="https://img.shields.io/badge/Total_Solved-${total}-blue?style=for-the-badge&logo=leetcode" alt="Total Solved" />
  <img src="https://img.shields.io/badge/Easy-${easy}-brightgreen?style=for-the-badge" alt="Easy" />
  <img src="https://img.shields.io/badge/Medium-${medium}-yellow?style=for-the-badge" alt="Medium" />
  <img src="https://img.shields.io/badge/Hard-${hard}-red?style=for-the-badge" alt="Hard" />
</div>

<div align="center">
  <i>${lastUpdated}</i>
</div>

---

## Solutions
| # | Problem | Difficulty | Language | Date |
|---|---------|------------|----------|------|
${rows.join('\n')}
`;

    return markdown;
  }
}
