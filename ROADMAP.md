# Observability Roadmap

## Goal

Build an observability stack for agent execution that uses:

- pino + Loki for structured logs
- OpenTelemetry for spans and traces
- ClickHouse as the backend for trace/span storage and query
- Grafana for dashboards and correlation views

## Current Status

- Structured runtime span metadata is now emitted from the agent runtime.
- Runtime tests cover span metadata and tool span duration.
- The next step is to wire actual OpenTelemetry span emission and connect it to the tracing backend.

## Planned Phases

### Phase 1 — Runtime instrumentation
- Keep structured logs in pino/Loki.
- Emit root and child spans from the agent runtime.
- Preserve trace/span identifiers and duration metadata.

### Phase 2 — OpenTelemetry integration
- Add an OpenTelemetry tracer provider.
- Create spans for reasoning, tool calls, tool results, final output, and root execution.
- Propagate trace context across agent execution steps.

### Phase 3 — Backend wiring
- Configure an OpenTelemetry collector/exporter path for ClickHouse.
- Ensure trace data is ingested and queryable from Grafana.

### Phase 4 — Grafana experience
- Add dashboards for tool latency, error spans, and per-run execution views.
- Correlate logs and traces through shared trace identifiers.
