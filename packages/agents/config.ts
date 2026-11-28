/**
 * @file config.ts
 * @description Centralized configuration for the Support Agent, including model settings, instruction paths, and skill management.
 */
export const AGENT_CONFIG = {
  anchor: '### FINAL DIRECTIVE\nPrioritize entity resolution and customer satisfaction.',
  basePath: './agents/instructions.txt',
  skillsPath: './agents/skills/'
};

export const CONTEXT_ANCHOR = [
  '### CONVERSATION MEMORY',
  '1. The CURRENT_KNOWLEDGE_GRAPH is memory reconstructed from this conversation\\'s events.',
  '2. ACTIVE_CONTEXT_ITEMS contains entities or domain records already observed or explicitly recorded. It is context, not a request to act.',
  '3. A SUPPORT_PROBLEM is a problem being investigated. It is not automatically a TICKET.',
  '4. A TICKET is a help-desk record created only after the support-ticket qualification bar is met.',
  '5. A PROJECT_ISSUE is a work item in a specific project\\'s repository. It remains distinct from a TICKET even when the ticket queue uses GitHub as its backend.',
  '6. Never infer that a ticket or project issue exists merely because a chat session began or a user described a problem.',
  '7. Do not create or close tickets or project issues unless the user\\'s request and the applicable workflow call for that specific action.',
].join('\\n');
