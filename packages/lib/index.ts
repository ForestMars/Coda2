/**
 * @file index.ts
 * @description /packages/lib barrel
 */

export { PROJECT_ROOT } from './project-root';
export { AgentRuntime, AgentRuntimeStatus } from './agent-runtime';
export { InfrastructureError } from './errors';
export { ModuleNotFoundError } from './errors';
export type { AgentRuntimeRunOptions, AgentRuntimeResult, AgentRuntimeState, AgentRuntimeCallbacks, AgentRuntimeFactory, AgentRuntimeSpan, AgentRuntimeMetadata } from './agent-runtime';
