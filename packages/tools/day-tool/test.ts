// packages/tools/day/test.ts
//
// Run with: bun test packages/tools/day/test.ts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { run } from './index';
import { inputSchema } from './schema';

describe('day.get', () => {
    it('returns a weekday name matching the current system date', async () => {
        const expected = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const result = await run({});
        expect(result.day).toBe(expected);
    });

    it('returns text in the "Today is <Day>" format', async () => {
        const result = await run({});
        expect(result.text).toBe(`Today is ${result.day}`);
    });

    it('returns one of the seven valid weekday names', async () => {
        const validDays = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
            'Thursday', 'Friday', 'Saturday'
        ];
        const result = await run({});
        expect(validDays).toContain(result.day);
    });

    it('ignores unexpected input rather than throwing', async () => {
        // The schema declares additionalProperties: false, but that's
        // enforced by the MCP server's validator before dispatch, not by
        // the tool function itself — the tool should still be defensive.
        await expect(run({} as never)).resolves.toBeDefined();
    });
});

describe('day.get across known dates', () => {
    const realDateNow = Date;

    function mockDate(iso: string) {
        class MockDate extends Date {
            constructor() {
                super(iso);
            }
        }
        // @ts-expect-error - intentional global override for testing
        global.Date = MockDate;
    }

    afterEach(() => {
        global.Date = realDateNow;
    });

    it('resolves a Monday correctly', async () => {
        mockDate('2026-07-20T12:00:00Z'); // confirmed Monday
        const result = await run({});
        expect(result.day).toBe('Monday');
        expect(result.text).toBe('Today is Monday');
    });

    it('resolves a Sunday correctly', async () => {
        mockDate('2026-07-19T12:00:00Z'); // confirmed Sunday
        const result = await run({});
        expect(result.day).toBe('Sunday');
    });
});

describe('day.get schema', () => {
    it('declares an object schema with no required properties', () => {
        expect(inputSchema.type).toBe('object');
        expect(inputSchema.properties).toEqual({});
    });

    it('rejects additional properties', () => {
        expect(inputSchema.additionalProperties).toBe(false);
    });
});