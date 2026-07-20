import registry from "./registry.json";
import { runTool } from "./loader";

const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 5555;
const HOST = process.env.MCP_HOST || "0.0.0.0";

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return undefined;
    }
    return new Response("Expected WebSocket", { status: 400 });
  },
  websocket: {
    open(ws) {
      console.log("🔌 [Coda2 MCP] Polyglot / MCP Client connected");
    },
    async message(ws, rawMessage) {
      try {
        const message = JSON.parse(rawMessage.toString());
        const { id, method, params } = message;

        if (!id) return; // Skip notifications without IDs

        switch (method) {
          // 1. Tool Discovery
          case "tools/list": {
            const toolsList = Array.isArray(registry) ? registry : Object.values(registry);
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id,
                result: { tools: toolsList }
              })
            );
            break;
          }

          // 2. Tool Execution
          case "tools/call": {
            const { name, arguments: args } = params || {};

            try {
              const result = await runTool(name, args);

              ws.send(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
                      }
                    ]
                  }
                })
              );
            } catch (err: any) {
              ws.send(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id,
                  error: {
                    code: -32603,
                    message: `Tool execution error: ${err.message}`
                  }
                })
              );
            }
            break;
          }

          default: {
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id,
                error: {
                  code: -32601,
                  message: `Method '${method}' not found`
                }
              })
            );
          }
        }
      } catch (err) {
        console.error("❌ [Coda2 MCP] Invalid JSON-RPC message:", err);
      }
    },
    close(ws) {
      console.log("🔌 [Coda2 MCP] Client disconnected");
    }
  }
});

console.log(`🚀 [Coda2 MCP Server] Listening on ws://${HOST}:${PORT}`);