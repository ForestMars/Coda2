/**
 * Minimal side-effect-free tool used to verify the standalone MCP service.
 */
export async function run(_args: Record<string, never> = {}): Promise<{ message: string }> {
  return { message: 'hello world' };
}
