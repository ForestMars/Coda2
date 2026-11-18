FROM oven/bun:1.3.10

WORKDIR /app

# Keep the runtime image independent of the Coda2 application workspace.
COPY services/toolserver/package.json ./package.json
RUN bun install --production

# The standalone service ships the canonical MCP server and its explicitly
# allowlisted hello-world implementation, not the whole application/tool set.
COPY packages/tools/mcpServer.ts ./packages/tools/mcpServer.ts
COPY packages/tools/registry.json ./packages/tools/registry.json
COPY packages/tools/hello_world ./packages/tools/hello_world

ENV HOST=0.0.0.0 \
    PORT=5555 \
    TOOLSERVER_TOOL_ALLOWLIST=hello_world \
    MCP_ALLOWED_HOSTS=localhost,127.0.0.1,toolserver

EXPOSE 5555

USER bun

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:5555/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "packages/tools/mcpServer.ts"]
