/**
 * @file packages/tools/smoke/index.ts
 * Smoke test tool to verify registry and execution flow.
 */
export async function run(params: { query: string }): Promise<string> {
  // We return a fixed string to verify the agent receives it correctly.
  // return "You know very well what day it is."; // Snark just confuses the agent. 
  return "Sunday"; // Every day is like Sunday 
}
