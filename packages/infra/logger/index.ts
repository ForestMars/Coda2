/**
 * @file logger.ts
 * @description O11y 2.0 Logger using AsyncLocalStorage for automatic context tracking.
 * Configured to use direct streams in Bun (Dev) and optimized JSON transport in Prod.
 */
import pino from 'pino';
import pinoLoki from 'pino-loki';
import { AsyncLocalStorage } from 'node:async_hooks';

import { AGENT_MODEL } from '@sup/infra/env';

export const pinoStorage = new AsyncLocalStorage<
  Record<string, any>
>();

const MODEL_NAME = AGENT_MODEL
const isTerminal = process.stdout.isTTY;
const isDev = process.env.NODE_ENV !== 'production';
const lokiEnabled = process.env.LOKI_ENABLED === 'true';

const streams: pino.StreamEntry[] = [];

const lokiStream = await pinoLoki({
  host: process.env.LOKI_HOST || 'http://localhost:3100',
  labels: { app: 'sup' },
  batching: { interval: 5 },
});

if (isTerminal && isDev) {
  const pretty = require('pino-pretty')({
    colorize: true,
    levelFirst: true,
    singleLine: false,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });
  streams.push({ stream: pretty, level: 'debug' });
} else {
  streams.push({
    stream: pino.destination(2),
    level: 'info',
  });
}

if (lokiEnabled) {
  streams.push({ stream: lokiStream, level: 'info' });
}

const loggerInstance = pino(
  {
    // level: isDev ? 'debug' : 'info',
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { model: MODEL_NAME, runtime: 'bun' },
  },
  pino.multistream(streams),
);

export const logger = new Proxy(loggerInstance, {
  get(target, prop, receiver) {
    const store = pinoStorage.getStore();
    const value = Reflect.get(target, prop, receiver);
    if (
      typeof value === 'function' &&
      store &&
      typeof prop === 'string' &&
      ['debug', 'info', 'warn', 'error', 'fatal'].includes(
        prop,
      )
    ) {
      return value.bind(target.child(store));
    }
    return value;
  },
});

export function handleRequest(ctx: {
  requestId: string;
  userId?: string;
}) {
  pinoStorage.run(
    {
      requestId: ctx.requestId,
      userId: ctx.userId ?? 'anonymous',
    },
    () => {
      logger.info(
        { component: 'http', route: '/chat' },
        'Request received',
      );
    },
  );
}
