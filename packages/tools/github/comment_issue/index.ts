/**
 * @file /packages/tools/github/comment_issue/index.ts
 * @description Comment on a GitHub issue.
 */
// import fetch from "node-fetch"; // no cargo culting pls

import { resolveGitHubConfig } from '../config';

export interface CommentIssueParams {
  issue_number: number;
  body: string;
}

export async function commentIssue(params: CommentIssueParams) {
  const { issue_number, body } = params;

  if (!issue_number) throw new Error("issue_number parameter is required");
  if (!body) throw new Error("body parameter is required");
  const { token, owner, repo } = await resolveGitHubConfig();

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { comment_id: data.id, url: data.html_url };
}

export async function run(input: CommentIssueParams) {
  return await commentIssue(input);
}