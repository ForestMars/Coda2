/**
 * @module FeatureFlags
 * @file src/index.ts
 * @description Dev-first OpenFeature setup.
 * Default: Local flagd/config. Fallback: PostHog Production.
 */

import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';
// import { PostHogProvider } from '@tapico/node-openfeature-posthog';
const { PostHogProvider } = await import('@tapico/node-openfeature-posthog');

const isDev =
  Bun.env.NODE_ENV === 'development' || !Bun.env.NODE_ENV;

async function initFlags() {
  if (isDev) {
    await OpenFeature.setProviderAndWait(
      new FlagdProvider({
        host: 'localhost',
        port: 8013,
      }),
    );
    console.log('Dev Mode: Using local flagd from /config');
  } else {
    // PRODUCTION (Fallback)
    await OpenFeature.setProviderAndWait(
      new PostHogProvider({
        posthogConfiguration: {
          apiKey: Bun.env.POSTHOG_API_KEY!,
          clientOptions: {
            host: 'https://us.i.posthog.com',
          },
        },
      }),
    );
    console.log('Production Mode: Connected to PostHog');
  }
}

await initFlags();
export const client = OpenFeature.getClient();
