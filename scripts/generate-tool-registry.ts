/**
 * @fileoverview Scans tool manifests under `packages/tools`, validates MCP tool names,
 * filters out inactive or malformed manifests, and generates a deterministic `registry.json`.
 *
 * @remarks
 * Run via `bun run load:tools` or as a `prestart` build hook.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

/** Directory path where individual tools and their manifests reside. */
const TOOLS_DIR = join(import.meta.dir, "../packages/tools");

/** Destination path for the generated runtime registry manifest. */
const REGISTRY_PATH = join(TOOLS_DIR, "registry.json");

/** Regular expression ensuring tool names conform strictly to the Model Context Protocol naming specification. */
const MCP_TOOL_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;

/**
 * Shape of an individual `manifest.json` authoring file located inside a tool directory.
 */
interface ToolManifest {
  /** Unique name identifying the tool in the MCP server. */
  name: string;
  /** Optional human-readable description of the tool's purpose. */
  description?: string;
  /** Relative entry point file (defaults to `index.ts` if omitted). */
  entry?: string;
  /** Lifecycle status indicator (`"inactive"` or `0` will exclude the tool from production). */
  status?: string | number;
  /** Input parameter JSON Schema declaration. */
  inputSchema?: Record<string, unknown>;
  /** Alternative alias for `inputSchema`. */
  parameters?: Record<string, unknown>;
}

/**
 * Clean runtime tool representation written to `registry.json` for consumption by the HTTP server.
 */
interface RegistryEntry {
  /** Validated tool name. */
  name: string;
  /** Brief description for client discovery. */
  description: string;
  /** Relative module path under `packages/tools` for dynamic importing. */
  importPath: string;
  /** Sanitized JSON schema defining parameters. */
  inputSchema: Record<string, unknown>;
}

/**
 * Structural failure record logged when a tool manifest fails validation checks.
 */
interface ManifestError {
  /** Path to the invalid manifest relative to {@link TOOLS_DIR}. */
  manifestPath: string;
  /** Descriptive explanation of the validation or parsing failure. */
  reason: string;
  /** Optional actionable instruction to fix the issue. */
  suggestion?: string;
}

/**
 * Recursively scans a directory for all `manifest.json` files.
 *
 * @param dir - Root path from which to begin directory traversal.
 * @returns A promise resolving to an array of absolute file paths to discovered manifests.
 */
async function findManifests(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name === "manifest.json")
    .map((e) => join(e.parentPath, e.name));
}

/**
 * Scans, parses, validates, and writes the active tool registry to {@link REGISTRY_PATH}.
 *
 * @remarks
 * Employs a text-level fast-exit check (`raw.includes('"status"')`) before JSON parsing
 * to bypass status evaluation on active manifests with zero overhead.
 *
 * @throws {@link Error} If execution fails catastrophically or zero tools pass validation.
 */
async function generateRegistry(): Promise<void> {
  const manifestPaths = await findManifests(TOOLS_DIR);
  const totalManifests = manifestPaths.length;
  const registry: RegistryEntry[] = [];
  const errors: ManifestError[] = [];
  const skippedInactive: string[] = [];

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

    /**
     * Fast-Exit Check: Avoids full property evaluation if "status" is omitted in raw text.
     */
    const hasStatusProperty = raw.includes('"status"');

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

    // Evaluate inactive status if present
    if (hasStatusProperty && manifest.status !== undefined) {
      const isInactive = manifest.status === "inactive" || manifest.status === 0;
      if (isInactive) {
        skippedInactive.push(`${relPath} (status: ${JSON.stringify(manifest.status)})`);
        continue;
      }
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

  // Log explicitly skipped inactive tools
  if (skippedInactive.length > 0) {
    console.log(`\n⏸️ Skipped ${skippedInactive.length} inactive tool(s):`);
    for (const item of skippedInactive) {
      console.log(`  • ${item}`);
    }
    console.log("");
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
    console.error(`❌ Critical failure: 0 active tools were successfully loaded out of ${totalManifests} found.`);
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
    console.log(`ℹ️ Registry unchanged (${registry.length} active tools out of ${totalManifests} loaded). [no-op]`);
    return;
  }

  await writeFile(REGISTRY_PATH, newContent, "utf-8");
  console.log(`🚀 Registry updated: ${registry.length} active tools out of ${totalManifests} loaded -> packages/tools/registry.json`);
}

generateRegistry().catch((err) => {
  console.error("❌ Fatal execution error:", err);
  process.exit(1);
});