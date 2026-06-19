/**
 * @file index.ts
 * @description Central registry for all tools.
 */
import registry from "./registry.json" assert { type: "json" };
import { runTool } from "./loader";

export { runTool };
export const tools = registry;

// This was our old smoke test
// import { entityLookupTool } from './order-tools';

// This was just a placeholder 
// import { itTicketTool } from './it-tools';

// Not sure 
import adapters, { entityLookupAdapter } from './adapters';
// ... other 8 tools

/*

export const toolRegistry = [
  entityLookupTool,
  // itTicketTool,
  // ...
];

export type Tool = (typeof toolRegistry)[number];

*/ 
export { adapters, entityLookupAdapter };
// export { baseTools } from './order-tools';

/* 
export {
  baseTools,
  billingTools,
  resolutionTools,
} from './order-tools';

*/