# sup / coda

> Monorepo core for the `sup`/`coda` infrastructure platform — an agentic execution and coding harness built for structured tool orchestration, runtime observability, contextual memory, and multi-runtime experimentation.

---

## Table of Contents

- [Background](#background)
- [Architecture Overview](#architecture-overview)
- [Repository Layout](#repository-layout)
- [Quick Start](#quick-start)
- [Development Model](#development-model)
- [TUI Runtime Notes](#tui-runtime-notes)
- [Known Issues](#known-issues)
- [Advanced Runtime Debugging](#advanced-runtime-debugging)
- [Component Status](#component-status)

---

## Background

This repository began as `sup`, an enterprise support agent named for its habit of greeting with "Sup?" It evolved into **Coda**: a full agentic coding harness and infrastructure platform. The codebase retains the `sup` namespace across package names and tooling conventions (backlog issue.)

> **Q:** What do you call a programmer from Boston?
> **A:** *"a coda"*

This is not merely an application repository. It is an **agent systems platform** — a substrate for building, running, and observing autonomous agents across heterogeneous runtimes.

---

## Architecture Overview

### Pure Workspace Topology

The monorepo uses strict workspace resolution with no TypeScript path aliases, no bundler alias rewrites, and no virtual import indirection. Imports resolve exclusively through native workspace topology and package boundaries.

```ts
// Correct — resolves through workspace topology
import { adapters } from "@sup/tools"

// Never — alias indirection is not used here
import { adapters } from "@/tools"
```

This preserves explicit dependency graphs and prevents resolver drift across runtimes, tooling chains, and build systems. The dependency graph is always what it appears to be.

### Protocol-Mediated Execution

The platform implements a protocol abstraction layer via `ProtocolResolver` and a family of adapters. Rather than coupling agent logic to specific execution transports, the architecture routes execution through protocol-aware adapters. This enables:

- Runtime-independent agent execution
- Swappable transport bindings
- Structured protocol lifecycle management

Protocol execution is a first-class concern, not an implementation detail.

### Agent Specialization and Domain Routing

Agents are specialized by domain with distinct model specifications and runtime selection:

| Domain | Purpose |
|---|---|
| `coding` | Agentic coding tasks, code generation, repository interaction |
| `support` | Enterprise support workflows, conversational resolution |

This is not just a configuration split — it reflects capability partitioning and domain-aware execution routing. Each agent domain carries its own model binding, tool permissions, and runtime context.

### Runtime Feature Infrastructure

Feature control follows the [OpenFeature](https://openfeature.dev/) specification. The platform supports provider-driven flag evaluation and runtime capability gating:

- Multi-provider evaluation
- Environment and provider-backed configuration
- Progressive enablement and isolation of agent capabilities

Agent behavior and infrastructure capabilities can be enabled, isolated, or experimentally deployed without touching execution logic. This is a provider-first infrastructure model — features are managed at the platform layer, not embedded in business logic.

### Contextual Memory and Knowledge Graph Reasoning

Agent memory is modeled as a knowledge-linked contextual system rather than a flat conversational buffer. The architecture supports:

- Structured memory persistence
- Relationship-aware retrieval
- Contextual problem solving
- Cross-session state recovery

Memory is treated as navigable context capable of supporting longer-horizon reasoning and operational continuity — not merely prompt accumulation.

### Wide Structured Telemetry

Coda treats observability as a first-class runtime primitive. Execution surfaces emit structured telemetry across:

- Tool invocation
- Protocol execution
- Runtime events
- Agent state transitions
- Infrastructure interactions

This enables debugging, tracing, and behavioral analysis at the agent execution layer — not just at the application boundary. Telemetry is wired in, not bolted on.

### Multi-Runtime Experimentation

The platform intentionally spans multiple runtimes to explore emerging execution models:

- **Node.js** — primary backend runtime
- **Bun** — required for the TUI; evaluated for broader adoption
- **Terminal-native interfaces** — experimental TUI via `@opentui/core` with native FFI
- **Runtime-dependent transport and FFI systems** — per-runtime capability binding

---

## Repository Layout

```
apps/
  tui/              Experimental terminal UI (Bun-only, see TUI Runtime Notes)

packages/
  agents/           Agent definitions, domain routing, orchestration logic
  infra/            Providers, adapters, OpenFeature bindings, infrastructure interfaces
  lib/              Cross-cutting runtime and protocol logic
  tools/            Shared utility libraries (declaration-only during development)

.auth               Local credential file (not committed)
package.json        Workspace configuration
tsconfig.json       Shared compiler configuration
```

---

## Quick Start

### Prerequisites

This repository uses both **Node.js (LTS)** and **Bun**. Ensure Bun is available on your shell path before proceeding.

If an NVM switch or local Node upgrade resets your path configuration:

```sh
export PATH="$HOME/.bun/bin:$PATH"
```

### Install

From the repository root:

```sh
bun install
```

### Running Backend Services

Most backend services and shared packages run through standard workspace tooling:

```sh
npm run dev --workspace=<target-package>
```

Example:

```sh
npm run dev --workspace=apps/api
```

### Running the TUI

The terminal interface lives at `apps/tui`. It requires Bun and has specific environment requirements:

```sh
AGENT=coding PINOLOGGER_DISABLED=true bun run apps/tui/index.tsx
```

See [TUI Runtime Notes](#tui-runtime-notes) for the full explanation of these requirements.

---

## Development Model

### No Path Aliases

TypeScript `paths` mappings and bundler alias rewrites are not used. All imports resolve through native workspace topology.

This keeps dependency relationships explicit and prevents resolver divergence across runtimes and build systems. The dependency graph is legible without toolchain knowledge.

### Declaration-Only Internal Packages

Some packages — notably `packages/tools` — are configured with:

```json
"emitDeclarationOnly": true
```

These packages emit TypeScript declarations but produce no compiled JavaScript locally. Consumers either execute upstream source directly or use runtimes capable of source evaluation (e.g., Bun, ts-node).

This keeps workspace iteration lightweight and avoids redundant local compilation steps during development.

---

## TUI Runtime Notes

The TUI requires **Bun**. This is not a preference — it is a hard runtime requirement driven by three distinct constraints.

### 1. Declaration-Only Package Resolution

Portions of the workspace emit declarations rather than compiled JS. Standard Node ESM execution cannot resolve these internal package dependencies without additional transpilation or pre-emitted output, producing module resolution failures at TUI entrypoints.

### 2. OpenTUI FFI Requirements

`@opentui/core` relies on Bun-native FFI bindings via `bun:ffi` and related memory structures to communicate with low-level terminal rendering systems. Standard Node execution is insufficient — the FFI layer is Bun-native.

### 3. Loki / Bun Compatibility

Remote Loki logging is currently disabled within the TUI runtime. Observed behavior:

- TUI startup succeeds with Loki disabled
- TUI startup crashes under Bun when Loki transport initialization is enabled

`PINOLOGGER_DISABLED=true` is required when launching the TUI until transport isolation is resolved.

---

## Known Issues

### Blank Screen on Initial TUI Launch

The TUI may occasionally render a blank viewport immediately after startup. This occurs when terminal dimensions are not fully available before framebuffer initialization.

**Workaround:** Resize the terminal window slightly. This emits a `SIGWINCH` event and forces viewport recalculation. The interface repaints immediately.

---

## Advanced Runtime Debugging

### Re-Enabling Loki for TUI Development

Do not remove `PINOLOGGER_DISABLED=true` without first isolating the Loki transport layer.

One experimental approach: intercept the runtime dependency during Bun startup and substitute a minimal transport implementation.

**`apps/tui/dev-bootstrap.ts`**

```ts
import { plugin } from "bun";

plugin({
  setup(build) {
    build.onLoad({ filter: /pino-loki/ }, () => ({
      contents: `
        export default () => ({ stream: process.stdout });
      `,
      loader: "js",
    }));
  },
});

import "./index.tsx";
```

Run with:

```sh
bun run apps/tui/dev-bootstrap.ts
```

This approach is intended for debugging and local experimentation. It is not a production transport solution.

---

## Component Status

| Component | Status |
|---|---|
| Shared packages | Stable |
| Backend services | Stable |
| Agent runtime | Active development |
| TUI | Experimental |

---

## Documentation

As GitBook documentation matures, deeper architectural and runtime material will migrate there. This README serves as the primary onboarding and operational reference in the interim.
