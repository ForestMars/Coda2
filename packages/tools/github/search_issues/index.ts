/**
 * @file /packages/tools/github/search_issues/index.ts
 * @description Search GitHub issues.
 */
// import fetch from "node-fetch"; // no cargo culting pls

import { resolveGitHubConfig } from '../config';

export interface SearchIssuesParams {
  query: string;
  state?: "open" | "closed" | "all";
}

export async function searchIssues(params: SearchIssuesParams) {
  const { query, state = "open" } = params;

  const { token, owner, repo } = await resolveGitHubConfig();

  const stateFilter = state === "all" ? "" : ` is:${state}`;
  const q = encodeURIComponent(`is:issue repo:${owner}/${repo}${query ? ` ${query}` : ""}${stateFilter}`.trim());
  // const q = encodeURIComponent(`is:issue repo:${owner}/${repo} ${query}`);
  const res = await fetch(`https://api.github.com/search/issues?q=${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    total: data.total_count,
    issues: data.items.map((i: any) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      url: i.html_url
    }))
  };
}

export async function run(input: SearchIssuesParams) {
  return await searchIssues(input);
}