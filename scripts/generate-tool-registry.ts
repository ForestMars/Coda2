/**
 * @file scripts/generate-tool-registry.ts
 * @description Scans tool manifests, validates MCP tool names, and updates registry.json.
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

interface ValidationError {
  manifestPath: string;
  invalidName: string;
  expectedName: string;
}

async function findManifests(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "manifest.json")
    .map((e) => join(e.parentPath, e.name));
}

function validateToolName(name: string): boolean {
  return MCP_TOOL_NAME_REGEX.test(name);
}

async function generateRegistry() {
  const manifestPaths = await findManifests(TOOLS_DIR);
  const registry: RegistryEntry[] = [];
  const errors: ValidationError[] = [];

  for (const manifestPath of manifestPaths) {
    const raw = await readFile(manifestPath, "utf-8");
    const manifest: ToolManifest = JSON.parse(raw);
    const relPath = relative(TOOLS_DIR, manifestPath);

    // Validate tool name without crashing early
    if (!validateToolName(manifest.name)) {
      errors.push({
        manifestPath: relPath,
        invalidName: manifest.name,
        expectedName: manifest.name.replaceAll("/", ".")
      });
      continue;
    }

    const toolDir = relative(TOOLS_DIR, join(manifestPath, ".."));
    const importPath = join(toolDir, manifest.entry || "index.ts");

    registry.push({
      name: manifest.name,
      description: manifest.description,
      importPath,
      inputSchema: manifest.inputSchema || manifest.parameters || {}
    });
  }

  // Report all validation failures cleanly before exiting
  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} invalid tool name(s) in manifests:\n`);
    for (const err of errors) {
      console.error(`  • ${err.manifestPath}`);
      console.error(`    Current:  "${err.invalidName}"`);
      console.error(`    Expected: "${err.expectedName}"\n`);
    }
    console.error(`Names must match regex: ${MCP_TOOL_NAME_REGEX}`);
    process.exit(1);
  }

  // Sort deterministically
  registry.sort((a, b) => a.name.localeCompare(b.name));

  const newContent = JSON.stringify(registry, null, 2) + "\n";

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
  console.error("❌ Unexpected script error:", err);
  process.exit(1);
});