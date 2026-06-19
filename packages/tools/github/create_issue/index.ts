/**
 * @file /packages/tools/github/creat_issue/index.ts
 * @description Create GitHub issue.
 */
// import fetch from "node-fetch"; // no cargo culting pls

const token = process.env.GITHUB_TOKEN;
const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;

export interface CreateIssueParams {
  title: string;
  body?: string;
  labels?: string[];
}

export async function createIssue(params: CreateIssueParams) {
  const { title, body = "", labels = [] } = params;

  if (!title || title.trim() === '') {
    throw new Error(
      'title parameter is required. Please provide a brief title for the GitHub issue. Example: "Fix login bug" or "Add email validation"'
    );
  }

  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable not set");
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, body, labels })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    issue_number: data.number,
    url: data.html_url
  };
}

/**
 * Agent entrypoint
 * The agent runner calls this function with tool arguments.
 */
export async function run(input: CreateIssueParams = {} as CreateIssueParams) {
  return await createIssue(input);
}