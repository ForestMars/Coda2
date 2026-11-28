/**
 * @file /packages/tools/github/create_issue/index.ts
 * @description Create GitHub issue.
 */

import { randomUUID } from "node:crypto";
import { Gate, readConfig } from "@bindable-ai/gate";
import { resolveGitHubConfig } from "../config";

export interface CreateIssueParams {
  title: string;
  body?: string;
  labels?: string[];
}

let bindableGate: Gate | undefined;

function getBindableGate(): Gate {
  if (bindableGate) return bindableGate;

  const config = readConfig(process.env);
  if (config.mode !== "connected") {
    throw new Error(
      "Bindable Gate is not connected. Set BINDABLE_AGENT_ID, BINDABLE_GATE_CREDENTIAL, and BINDABLE_API_BASE_URL.",
    );
  }

  bindableGate = new Gate(config, { gateVersion: "sup/0.0.3" });
  return bindableGate;
}

export async function createIssue(params: CreateIssueParams) {
  const { title, body = "", labels = [] } = params;

  if (!title || title.trim() === "") {
    throw new Error(
      'title parameter is required. Please provide a brief title for the GitHub issue. Example: "Fix login bug" or "Add email validation"',
    );
  }

  const { token, owner, repo } = await resolveGitHubConfig();
  const gate = getBindableGate();
  const call = {
    tool: "github.create_issue",
    params: {
      repository: `${owner}/${repo}`,
      title,
      body,
      labels,
    },
    callId: randomUUID(),
  };

  const decision = await gate.before(call);
  if (decision.outcome !== "released") {
    throw new Error(decision.reason);
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const result = {
      issue_number: data.number,
      url: data.html_url,
    };

    await gate.after(call, {
      result,
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    await gate.after(call, {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

/**
 * Agent entrypoint
 * The agent runner calls this function with tool arguments.
 */
export async function run(input: CreateIssueParams = {} as CreateIssueParams) {
  return await createIssue(input);
}
