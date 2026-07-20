// scripts/generate-tool-registry.ts
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TOOLS_ROOT = path.join(process.cwd(), "packages/tools");
const OUTPUT_FILE = path.join(TOOLS_ROOT, "registry.json");

async function generate() {
  const tools: any[] = [];

  async function scan(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        
        try {
          const manifestPath = path.join(fullPath, "manifest.json");
          const manifestFile = Bun.file(manifestPath);
          
          if (await manifestFile.exists()) {
            const content = await manifestFile.json();
            
            // Map parameters/input_schema to standard MCP inputSchema
            const schema = content.inputSchema || content.parameters || content.input_schema || { type: "object", properties: {} };

            // Clean up old non-standard keys so registry stays strict
            delete content.parameters;
            delete content.input_schema;

            const relativePath = path.relative(TOOLS_ROOT, path.join(fullPath, content.entry || "index.ts"));

            tools.push({
              ...content,
              inputSchema: schema,
              importPath: relativePath.replace(/\\/g, '/')
            });
            continue; 
          }
        } catch (e) {
          // No manifest here, keep digging
        }
        
        await scan(fullPath);
      }
    }
  }

  await scan(TOOLS_ROOT);
  
  await writeFile(OUTPUT_FILE, JSON.stringify(tools, null, 2));
  console.log(`🚀 Registry generated: ${tools.length} tools found.`);
}

generate().catch(console.error);