/**
 * @file /packages/tools/github/get_repo_info/index.ts
 * @description Get the current GitHub repository configuration that will be used for ticket operations.
 */

export interface RepositoryInfo {
  owner: string;
  repo: string;
  fullName: string;
}

export async function getRepoInfo(): Promise<RepositoryInfo> {
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;

  if (!owner || !repo) {
    throw new Error(
      `Repository not configured. Set REPO_OWNER and REPO_NAME environment variables.`
    );
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

/**
 * Agent entrypoint
 * The agent runner calls this function with tool arguments.
 */
export async function run() {
  return await getRepoInfo();
}
