/**
 * @file infra/env.ts
 * @description Load environment first 
 */

const DEFAULT_OWNER = 'ForestMars';
const DEFAULT_REPO = 'coffee';
const DEFAULT_MODEL = 'qwen3:8b';
const DEFAULT_CODING_MODEL = 'qwen3:8b';
const DEFAULT_SUPPORT_AGENT_MODEL = 'qwen3:8b';

export const FACTOTUM_MODEL = 'qwen2.5:1.5b'; 
export const TEMPERATURE = 0;
export const AGENT_MODEL = process.env.SUPPORT_AGENT_MODEL || DEFAULT_MODEL;
export const REPO_OWNER = process.env.REPO_OWNER || DEFAULT_OWNER;
export const REPO_NAME = process.env.REPO_NAME || DEFAULT_REPO;

if (!process.env.SUPPORT_AGENT_MODEL) {
  process.env.SUPPORT_AGENT_MODEL = AGENT_MODEL;
}
if (!process.env.REPO_OWNER) {
  process.env.REPO_OWNER = REPO_OWNER;
}
if (!process.env.REPO_NAME) {
  process.env.REPO_NAME = REPO_NAME;
}