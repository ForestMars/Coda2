/**
 * @file scripts/generate-tool-registry.ts
 * @description Scans tool manifests, validates MCP tool names, and updates registry.json if changed.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const TOOLS_DIR = join(import.meta.dir, "../packages/tools");
const REGISTRY_PATH = join(TOOLS_DIR, "registry.json");
const MCP_TOOL_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

interface ToolManifest {
  name: string;
  description: string;
  entry: string;
  inputSchema?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

interface RegistryEntry {
  name: string;
  description: string;
  importPath: string;
  inputSchema: Record<string, unknown>;
}

async function findManifests(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "manifest.json")
    .map((e) => join(e.parentPath, e.name));
}

function validateToolName(name: string, manifestPath: string) {
  if (!MCP_TOOL_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid MCP tool name "${name}" in ${manifestPath}. Names must match ${MCP_TOOL_NAME_REGEX}`
    );
  }
}

async function generateRegistry() {
  const manifestPaths = await findManifests(TOOLS_DIR);
  const registry: RegistryEntry[] = [];

  for (const manifestPath of manifestPaths) {
    const raw = await readFile(manifestPath, "utf-8");
    const manifest: ToolManifest = JSON.parse(raw);

    validateToolName(manifest.name, relative(TOOLS_DIR, manifestPath));

    // Calculate relative import path from packages/tools directory
    const toolDir = relative(TOOLS_DIR, join(manifestPath, ".."));
    const importPath = join(toolDir, manifest.entry || "index.ts");

    registry.push({
      name: manifest.name,
      description: manifest.description,
      importPath,
      inputSchema: manifest.inputSchema || manifest.parameters || {}
    });
  }

  // Sort deterministically by tool name
  registry.sort((a, b) => a.name.localeCompare(b.name));

  const newContent = JSON.stringify(registry, null, 2) + "\n";

  // Check existing registry content to detect if anything changed
  let existingContent = "";
  try {
    existingContent = await readFile(REGISTRY_PATH, "utf-8");
  } catch {
    // registry.json does not exist yet
  }

  if (existingContent === newContent) {
    console.log(`ℹ️ Registry unchanged (${registry.length} tools up to date). [no-op]`);
    return;
  }

  await writeFile(REGISTRY_PATH, newContent, "utf-8");
  console.log(`🚀 Registry updated: ${registry.length} tools registered -> packages/tools/registry.json`);
}

generateRegistry().catch((err) => {
  console.error("❌ Registry generation failed:", err);
  process.exit(1);
});