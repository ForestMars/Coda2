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
import { AgentRuntime } from '@sup/lib';
import { adapters } from '@sup/tools';
import { JsonFileProvider } from '@sup/infra/adapters/JsonFileProvider';

const AGENT = process.env.AGENT_TYPE || 'coding';
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
  // rl.setPrompt('You: ');

  const session: AgentSession = {
    id: 'cli-session-' + Date.now(),
    events: [],
  };

  console.log(` Active Agent: \x1b[1m${AGENT.toUpperCase()}\x1b[0m`);
  console.log(` Active Model: \x1b[32m${typeof modelSpec === 'object' ? JSON.stringify(modelSpec) : modelSpec}\x1b[0m`);

  process.nextTick(() => rl.prompt());
  // logger.debug(`Agent: ${AGENT}`);
  //logger.debug(`Model: ${modelSpec}`);

  try {
    // rl.prompt();

    while (true) {
      const userInput = await rl.question('You: ');
      if (userInput.trim().toLowerCase() === 'exit') break;

      try {
        const runtime = new AgentRuntime({
          name: AGENT,
          sessionId: session.id,
          input: userInput,
        });

        let generator = agent(userInput, session, {
          resolver: ProtocolResolver,
          tools: adapters,
        });

        for (const adapterFn of activeAdapters) {
          generator = adapterFn(generator);
        }

        const renderState = { accumulated: '', firstToken: true };
        await runtime.run(() => generator, {
          onStep: (step) => {
            if (process.env.LOG_STEPS === 'true') {
              console.log(step);
            }
            renderStep(step, renderState);
          },
          onSpan: (span) => {
            if (process.env.LOG_STEPS === 'true') {
              console.log('[span]', span);
            }
          },
        });
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

function renderStep(step: AgentStep, state: { accumulated: string; firstToken: boolean }) {
  switch (step.type) {
    case 'thinking':
      if (STREAMING) process.stdout.write(`\n${step.message}\n`);
      break;

    case 'text_delta':
      if (STREAMING) {
        if (state.firstToken) {
          process.stdout.write('\nAgent: ');
          state.firstToken = false;
        }
        if (step.delta) process.stdout.write(step.delta);
      } else {
        if (step.delta) state.accumulated += step.delta;
      }
      break;

    case 'tool_call':
      if (STREAMING) {
        if (!state.firstToken) process.stdout.write('\n');
        process.stdout.write(`[${step.toolId}] `);
        state.firstToken = true;
      }
      break;

    case 'tool_result':
      if (STREAMING) process.stdout.write(`✓\n`);
      break;

    case 'final':
      if (STREAMING) {
        if (state.firstToken) {
          process.stdout.write(`\nAgent: ${step.text}`);
        }
        process.stdout.write('\n\n');
      } else {
        process.stdout.write(`\nAgent: ${state.accumulated || step.text}\n\n`);
      }
      state.accumulated = '';
      state.firstToken = true;
      break;
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