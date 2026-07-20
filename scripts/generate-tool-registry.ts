/**
 * @file scripts/generate-tool-registry.ts
 * @description Scans tool manifests, validates MCP tool names, skips broken manifests,
 * and updates registry.json with all valid tools.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const TOOLS_DIR = join(import.meta.dir, "../packages/tools");
const REGISTRY_PATH = join(TOOLS_DIR, "registry.json");
const MCP_TOOL_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

interface ToolManifest {
  name: string;
  description?: string;
  entry?: string;
  inputSchema?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

interface RegistryEntry {
  name: string;
  description: string;
  importPath: string;
  inputSchema: Record<string, unknown>;
}

interface ManifestError {
  manifestPath: string;
  reason: string;
  suggestion?: string;
}

async function findManifests(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "manifest.json")
    .map((e) => join(e.parentPath, e.name));
}

async function generateRegistry() {
  const manifestPaths = await findManifests(TOOLS_DIR);
  const totalManifests = manifestPaths.length;
  const registry: RegistryEntry[] = [];
  const errors: ManifestError[] = [];

  for (const manifestPath of manifestPaths) {
    const relPath = relative(TOOLS_DIR, manifestPath);
    let raw = "";

    try {
      raw = await readFile(manifestPath, "utf-8");
    } catch (err) {
      errors.push({
        manifestPath: relPath,
        reason: `Could not read file: ${err instanceof Error ? err.message : String(err)}`
      });
      continue;
    }

    if (!raw.trim()) {
      errors.push({
        manifestPath: relPath,
        reason: "File is completely empty (Unexpected EOF)"
      });
      continue;
    }

    let manifest: ToolManifest;
    try {
      manifest = JSON.parse(raw);
    } catch (err) {
      errors.push({
        manifestPath: relPath,
        reason: `Invalid JSON syntax: ${err instanceof Error ? err.message : String(err)}`
      });
      continue;
    }

    if (!manifest.name) {
      errors.push({
        manifestPath: relPath,
        reason: "Missing required property 'name' in manifest.json"
      });
      continue;
    }

    if (!MCP_TOOL_NAME_REGEX.test(manifest.name)) {
      errors.push({
        manifestPath: relPath,
        reason: `Invalid MCP tool name "${manifest.name}". Must match regex ${MCP_TOOL_NAME_REGEX}`,
        suggestion: `Change "${manifest.name}" to "${manifest.name.replaceAll("/", ".")}"`
      });
      continue;
    }

    const toolDir = relative(TOOLS_DIR, join(manifestPath, ".."));
    const importPath = join(toolDir, manifest.entry || "index.ts");

    registry.push({
      name: manifest.name,
      description: manifest.description || "",
      importPath,
      inputSchema: manifest.inputSchema || manifest.parameters || {}
    });
  }

  // Report errors for skipped manifests
  if (errors.length > 0) {
    console.error(`\n⚠️ Skipped ${errors.length} invalid tool manifest(s):\n`);
    for (const err of errors) {
      console.error(`  • ${err.manifestPath}`);
      console.error(`    Error:      ${err.reason}`);
      if (err.suggestion) {
        console.error(`    Fix:        ${err.suggestion}`);
      }
      console.error("");
    }
  }

  // Only hard fail if zero tools could be loaded at all
  if (registry.length === 0) {
    console.error(`❌ Critical failure: 0 tools were successfully loaded out of ${totalManifests} found.`);
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
    console.log(`ℹ️ Registry unchanged (${registry.length} tools out of ${totalManifests} loaded). [no-op]`);
    return;
  }

  await writeFile(REGISTRY_PATH, newContent, "utf-8");
  console.log(`🚀 Registry updated: ${registry.length} tools out of ${totalManifests} loaded -> packages/tools/registry.json`);
}

generateRegistry().catch((err) => {
  console.error("❌ Fatal execution error:", err);
  process.exit(1);
});