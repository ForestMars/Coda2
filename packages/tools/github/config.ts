/**
 * Resolve GitHub credentials and the configured target repository.
 *
 * GH_REPO is the canonical repository setting. It accepts either "repo"
 * (using GH_OWNER/REPO_OWNER, or the authenticated account as owner) or
 * "owner/repo". REPO_NAME and REPO_OWNER remain supported for compatibility.
 */
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

type GitHubEnvironment = Record<string, string | undefined>;

export async function resolveGitHubConfig(
  env: GitHubEnvironment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<GitHubConfig> {
  const token = env.GITHUB_TOKEN?.trim() || env.GH_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'GitHub credentials are not loaded. Set GITHUB_TOKEN (the support CLI loads .auth with "bun run sup").',
    );
  }

  const configuredRepository = env.GH_REPO?.trim() || env.REPO_NAME?.trim();
  if (!configuredRepository) {
    throw new Error('GitHub repository is not configured. Set GH_REPO in .env.');
  }

  const segments = configuredRepository.split('/').filter(Boolean);
  if (segments.length > 2 || segments.length === 0) {
    throw new Error(
      'Invalid GH_REPO value. Use "repo" or "owner/repo".',
    );
  }

  let owner: string | undefined;
  let repo: string;

  if (segments.length === 2) {
    [owner, repo] = segments;
  } else {
    repo = segments[0];
    owner = env.GH_OWNER?.trim() || env.REPO_OWNER?.trim();
  }

  if (!owner) {
    const response = await fetcher('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Unable to resolve the GitHub account for GH_REPO="${repo}" (HTTP ${response.status}). Set GH_OWNER or REPO_OWNER. ${detail}`,
      );
    }

    const user = await response.json() as { login?: string };
    owner = user.login;
  }

  if (!owner) {
    throw new Error('GitHub owner is not configured. Set GH_OWNER or REPO_OWNER.');
  }

  return { token, owner, repo };
}
