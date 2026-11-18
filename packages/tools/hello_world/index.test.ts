import { describe, expect, test } from 'bun:test';
import { run } from './index';

describe('hello_world tool', () => {
  test('returns the expected hello-world payload', async () => {
    await expect(run()).resolves.toEqual({ message: 'hello world' });
  });
});
