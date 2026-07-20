// packages/tools/loader.ts
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import registry from "./registry.json" assert { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runTool(name: string, args: any): Promise<any> {
  const toolEntry = registry.find(t => t.name === name);
  
  if (!toolEntry) {
    throw new Error(`Tool "${name}" not found in registry.`);
  }

  try {
    // We use the directory name (e.g., 'smoke') and the entry file (e.g., 'index.ts')
    // Assuming your registry structure stores the relative directory or path
    // If your registry generation script just has the name, we use the tool's directory:
    const folderName = name === 'smoke_test' ? 'smoke' : name; // Temporary fix for the naming mismatch
    
    const modulePath = join(__dirname, folderName, toolEntry.entry || 'index.ts');
    const toolModule = await import(modulePath);
    
    if (typeof toolModule.run !== 'function') {
      throw new Error(`Tool "${name}" must export an async function named "run"`);
    }

    return await toolModule.run(args);
  } catch (error) {
    console.error(`[Loader] Execution failed for tool: ${name}`, error);
    throw error;
  }
}