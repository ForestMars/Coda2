# Grafana / Loki Queries for Agent Runtime Spans

These queries assume the runtime is emitting structured JSON logs through the existing Loki transport and that your Loki datasource is using the `app="sup"` label.

## 1. Tool latency percentiles

### p50

```logql
{app="sup"}
| json
| eventType="span_end"
| name="tool"
| label_format toolId="{{if .toolId}}{{.toolId}}{{else}}unknown{{end}}"
| unwrap durationMs [5m]
```

### p95

```logql
quantile_over_time(0.95,
  {app="sup"}
  | json
  | eventType="span_end"
  | name="tool"
  | label_format toolId="{{if .toolId}}{{.toolId}}{{else}}unknown{{end}}"
  | unwrap durationMs [5m]
) by (toolId)
```

### p99

```logql
quantile_over_time(0.99,
  {app="sup"}
  | json
  | eventType="span_end"
  | name="tool"
  | label_format toolId="{{if .toolId}}{{.toolId}}{{else}}unknown{{end}}"
  | unwrap durationMs [5m]
) by (toolId)
```

## 2. Trace waterfall for a single run

Use a Grafana variable named `trace_id` and set it to the runtime `traceId` value.

```logql
{app="sup"}
| json
| traceId="$trace_id"
| sort_by_timestamp asc
| line_format "{{.name}} [{{.durationMs}}ms] -> {{.message}}"
```

## 3. Failed runs and error spans

```logql
{app="sup"}
| json
| eventType="span_end"
| status="error"
| line_format "{{.name}} failed in {{.durationMs}}ms :: {{.message}}"
```

## 4. Grafana derived field for trace drill-down

In Grafana, add a derived field for the Loki datasource:

- Name: `traceId`
- Regex: `"traceId":"([^"]+)"`
- URL/Link: use the Explore page or your trace viewer with a query like:

```text
{app="sup"} | json | traceId="${__value.raw}"
```

This makes each span log entry clickable and lets you jump directly into the execution trace for that run.
