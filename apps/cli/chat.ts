/**
 * @file apps/cli/chat.ts
 * @description Main entry point for the Coda/Support Agent CLI.
 */
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  OpenFeature,
  MultiProvider,
  FirstSuccessfulStrategy,
} from '@openfeature/server-sdk';

import { logger } from '@sup/infra/logger';
import type { AgentStep } from '@sup/types/agent-types';
import { ProtocolResolver } from '@sup/lib/protocol-resolver';
import { adapters } from '@sup/tools';
import { JsonFileProvider } from '@sup/infra/adapters/JsonFileProvider';

const AGENT = process.env.AGENT || 'support';
const { agent, modelSpec } = await (async () => {
  if (AGENT === 'coding') {
    const { codingAgent, codingAgentModelSpec } = await import('@sup/agents/coding-agent');
    return { agent: codingAgent, modelSpec: codingAgentModelSpec };
  }
  const { supportAgent, supportAgentModelSpec } = await import('@sup/agents/support-agent');
  return { agent: supportAgent, modelSpec: supportAgentModelSpec };
})();

const { OutputAdapters } = await import('@sup/agents/adapters/output-adapters');

const providers = [];
if (process.env.POSTHOG_API_KEY) {
  const { PostHogProvider } = await import('@tapico/node-openfeature-posthog');
  const { PostHog } = await import('posthog-node');
  const posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  });
  providers.push({ provider: new PostHogProvider({ posthogClient }) });
}
providers.push({ provider: new JsonFileProvider('../../config/flags.json') });

const multiProvider = new MultiProvider(providers, new FirstSuccessfulStrategy());
await OpenFeature.setProviderAndWait(multiProvider);

const fflags = OpenFeature.getClient();

// TTY = stream tokens as they arrive. Piped = collect and print at end.
const STREAMING = process.stdout.isTTY ?? false;

export async function startChat() {
  logger.debug(`Agent: ${AGENT}`);
  logger.debug(`Model: ${modelSpec}`);

  const activeAdapters = (
    await Promise.all(
      OutputAdapters.map(async (adapter) =>
        (await fflags.getBooleanValue(adapter.flagName, false))
          ? adapter.wrapper
          : null,
      ),
    )
  ).filter(Boolean);

  const rl = readline.createInterface({ input, output });
  rl.setPrompt('You: ');

  const session: AgentSession = {
    id: 'cli-session-' + Date.now(),
    events: [],
  };

  process.nextTick(() => rl.prompt());

  try {
    rl.prompt();

    while (true) {
      const userInput = await rl.question('');
      if (userInput.trim().toLowerCase() === 'exit') break;

      try {
        let generator = agent(userInput, session, {
          resolver: ProtocolResolver,
          tools: adapters,
        });

      for (const adapterFn of activeAdapters) {
        generator = adapterFn(generator);
      }

    await renderStream(generator);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error in agent execution:', message);
    console.error('Full error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
  }

  rl.prompt();
    }
  } finally {
    rl.close();
  }
}

async function renderStream(
  generator: AsyncGenerator<AgentStep, void, unknown>
): Promise<void> {
  let accumulated = '';
  let firstToken = true;

  for await (const step of generator) {
    if (process.env.LOG_STEPS === "true") {
      console.log(step);
    }
    switch (step.type) {
      case 'thinking':
        if (STREAMING) process.stdout.write(`\n${step.message}\n`);
        break;

      case 'text_delta':
        if (STREAMING) {
          if (firstToken) {
            process.stdout.write('\nAgent: ');
            firstToken = false;
          }
          if (step.delta) process.stdout.write(step.delta);
        } else {
          if (step.delta) accumulated += step.delta;
        }
        break;

      case 'tool_call':
        if (STREAMING) {
          if (!firstToken) process.stdout.write('\n');
          process.stdout.write(`[${step.toolId}] `);
          firstToken = true;
        }
        break;

      case 'tool_result':
        if (STREAMING) process.stdout.write(`✓\n`);
        break;

      case 'final':
        if (STREAMING) {
          if (firstToken) {
            process.stdout.write(`\nAgent: ${step.text}`);
          }
          process.stdout.write('\n\n');
        } else {
          process.stdout.write(`\nAgent: ${accumulated || step.text}\n\n`);
        }
        accumulated = '';
        firstToken = true;
        break;
    }
  }
}

if (import.meta.main) {
  startChat().catch((err) => {
    logger.error('Fatal CLI Error:', err);
    console.error('Full error:', err);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  });
}