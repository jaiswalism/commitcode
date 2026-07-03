export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export interface GitHubFile {
  path: string;
  sha: string;
  content: string; // Base64 encoded
}

export interface GitHubDirectoryItem {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

export class GitHubClient {
  private pat: string;
  private repo: string; // Format: owner/repo
  private baseUrl = 'https://api.github.com';

  private encodePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  constructor(pat: string, repo: string) {
    this.pat = pat;
    this.repo = repo;
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Authorization': `token ${this.pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new GitHubError(401, 'Invalid GitHub Personal Access Token');
      } else if (response.status === 403) {
        throw new GitHubError(403, 'Rate limit exceeded or permission denied');
      } else if (response.status === 404) {
        throw new GitHubError(404, 'Repository or path not found');
      } else if (response.status === 409) {
        throw new GitHubError(409, 'Conflict: The provided SHA does not match the current file');
      } else {
        throw new GitHubError(response.status, `GitHub API Error: ${response.statusText}`);
      }
    }

    return response;
  }

  async testConnection(): Promise<void> {
    // GET /repos/{owner}/{repo}
    await this.fetchApi(`/repos/${this.repo}`);
    // Note: To truly confirm Contents R/W, we'd check token scopes, but PATs don't always expose scopes easily in the response headers.
    // Testing a read is a good start. 
  }

  async getFile(path: string): Promise<GitHubFile> {
    const response = await this.fetchApi(`/repos/${this.repo}/contents/${this.encodePath(path)}`);
    const data = await response.json();
    
    if (Array.isArray(data)) {
      throw new Error(`Path ${path} is a directory, not a file`);
    }

    return {
      path: data.path,
      sha: data.sha,
      content: data.content
    };
  }

  async getFileSha(path: string): Promise<string | null> {
    try {
      const response = await this.fetchApi(`/repos/${this.repo}/contents/${this.encodePath(path)}`);
      const data = await response.json();
      if (Array.isArray(data)) return null; // It's a directory
      return data.sha || null;
    } catch (e: any) {
      if (e instanceof GitHubError && e.status === 404) {
        return null;
      }
      throw e;
    }
  }

  async putFile(path: string, content: string, message: string, sha?: string): Promise<void> {
    // Content must be base64 encoded
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const body: any = {
      message,
      content: encodedContent
    };

    if (sha) {
      body.sha = sha;
    }

    await this.fetchApi(`/repos/${this.repo}/contents/${this.encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async listDirectory(path: string): Promise<GitHubDirectoryItem[]> {
    try {
      const response = await this.fetchApi(`/repos/${this.repo}/contents/${this.encodePath(path)}`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error(`Path ${path} is a file, not a directory`);
      }

      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        type: item.type
      }));
    } catch (e: any) {
      if (e instanceof GitHubError && e.status === 404) {
        // Directory doesn't exist yet, return empty array
        return [];
      }
      throw e;
    }
  }

  async commitFiles(files: {path: string, content: string}[], message: string): Promise<void> {
    // 1. Get default branch
    const repoInfoResponse = await this.fetchApi(`/repos/${this.repo}`);
    const repoInfo = await repoInfoResponse.json();
    const branchName = repoInfo.default_branch;

    // 2. Get latest commit SHA on that branch
    const refResponse = await this.fetchApi(`/repos/${this.repo}/git/refs/heads/${branchName}`);
    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;

    // 3. Get base tree SHA
    const commitResponse = await this.fetchApi(`/repos/${this.repo}/git/commits/${latestCommitSha}`);
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // 4. Create blobs and tree items
    const treeItems = await Promise.all(files.map(async (file) => {
      // Content must be base64 encoded for POST blobs
      // using btoa(unescape(encodeURIComponent())) for utf-8 support
      const encodedContent = btoa(unescape(encodeURIComponent(file.content)));
      
      const blobResponse = await this.fetchApi(`/repos/${this.repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: encodedContent,
          encoding: 'base64'
        })
      });
      const blobData = await blobResponse.json();

      return {
        path: file.path, // raw path for tree API
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      };
    }));

    // 5. Create new tree
    const treeResponse = await this.fetchApi(`/repos/${this.repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });
    const treeData = await treeResponse.json();

    // 6. Create new commit
    const newCommitResponse = await this.fetchApi(`/repos/${this.repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha]
      })
    });
    const newCommitData = await newCommitResponse.json();

    // 7. Update branch ref
    await this.fetchApi(`/repos/${this.repo}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false
      })
    });
  }
}
