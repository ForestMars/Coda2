# Standalone Coda2 toolserver

This directory packages the canonical Coda2 tool registry/runtime as an
independently deployable MCP Streamable HTTP service.

## Build and run

From the Coda2 repository root:

```sh
docker build -f services/toolserver/Dockerfile -t coda2-toolserver:local .
docker run --rm -p 127.0.0.1:5555:5555 coda2-toolserver:local
```

The MCP endpoint is `http://127.0.0.1:5555/mcp`; the readiness endpoint is
`http://127.0.0.1:5555/healthz`.

The standalone image deliberately sets `TOOLSERVER_TOOL_ALLOWLIST=hello_world`.
That exposes one harmless operation while exercising MCP discovery and tool
execution. The full registry remains in Coda2, and the existing in-workspace
server continues to expose the full registry when no allowlist is configured.

## Configuration

- `HOST`: listener address; defaults to `0.0.0.0` in the image.
- `PORT`: listener port; defaults to `5555`.
- `TOOLSERVER_TOOL_ALLOWLIST`: comma-separated tool names. When omitted, the
  in-workspace server loads the complete registry. Unknown names fail startup.
- `MCP_ALLOWED_HOSTS`: additional accepted Host header hostnames.
- `MCP_ALLOWED_ORIGINS`: additional accepted Origin values.

The local Devo module binds the published port to loopback. This first slice
does not implement client authentication or multi-tenant authorization; do not
publish it through an untrusted ingress. Production deployment must place it
behind the platform's service-mesh identity and traffic policies before
exposing non-demo tools.

The Dockerfile is intentionally self-contained: it copies only the server,
registry, and allowlisted tool module into the runtime image. The same image
build can be used by a production image pipeline or transferred into an
isolated environment; no runtime dependency on Devo or Coda2's application
process exists.
