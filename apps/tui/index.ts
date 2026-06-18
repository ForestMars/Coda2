import { render } from "@opentui/solid";
import { createSignal, For, onMount } from "solid-js";
import {
  OpenFeature,
  MultiProvider,
  FirstSuccessfulStrategy,
} from "@openfeature/server-sdk";

import { ProtocolResolver } from "@sup/lib/protocol-resolver";
import { adapters } from "@sup/tools";
import { JsonFileProvider } from "@sup/infra/adapters/JsonFileProvider";

type AgentSession = {
  id: string;
  events: any[];
};

type Message = { role: "user" | "agent"; text: string };

const AGENT = process.env.AGENT || "support";

function App() {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [streaming, setStreaming] = createSignal("");
  const [activeTool, setActiveTool] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  
  // Keep a reference to the active agent function
  let currentAgent: any = null;

  onMount(async () => {
    try {
      // 1. Setup OpenFeature without stalling root script
      const providers = [];
      if (process.env.POSTHOG_API_KEY) {
        const { PostHogProvider } = await import("@tapico/node-openfeature-posthog");
        const { PostHog } = await import("posthog-node");
        const posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
          host: process.env.POSTHOG_HOST || "https://app.posthog.com",
        });
        providers.push({ provider: new PostHogProvider({ posthogClient }) });
      }
      providers.push({ provider: new JsonFileProvider("../../config/flags.json") });

      const multiProvider = new MultiProvider(providers, new FirstSuccessfulStrategy());
      await OpenFeature.setProviderAndWait(multiProvider);

      // 2. Resolve Agent inside onMount so OpenTUI doesn't lock up module loading
      if (AGENT === "coding") {
        const { codingAgent } = await import("@sup/agents/coding-agent");
        currentAgent = codingAgent;
      } else {
        const { supportAgent } = await import("@sup/agents/support-agent");
        currentAgent = supportAgent;
      }

      setReady(true);
    } catch (e) {
      console.error("Initialization error:", e);
      setReady(true); // Fallback so UI still draws
    }
  });

  const session: AgentSession = {
    id: "tui-session-" + Date.now(),
    events: [],
  };

  async function submit(text: string) {
    if (!text.trim() || busy() || !ready() || !currentAgent) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const generator = currentAgent(text, session, {
        resolver: ProtocolResolver,
        tools: adapters,
      });

      for await (const step of generator) {
        if (step.type === "text_delta" && step.delta) {
          setStreaming((s) => s + step.delta);
        } else if (step.type === "tool_call") {
          setActiveTool(step.toolId);
        } else if (step.type === "tool_result") {
          setActiveTool("");
        } else if (step.type === "final") {
          setMessages((m) => [
            ...m,
            { role: "agent", text: step.text || streaming() },
          ]);
          setStreaming("");
          setActiveTool("");
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "agent", text: `Error: ${err}` }]);
    }

    setBusy(false);
  }

  return (
    <box width="100%" height="100%" flexDirection="column">
      <scrollbox grow={1} width="100%">
        <For each={messages()}>
          {(msg) => (
            <text>
              <span color={msg.role === "user" ? "cyan" : "green"}>
                {msg.role === "user" ? "You" : "Agent"}:{" "}
              </span>
              {msg.text}
            </text>
          )}
        </For>
        {streaming() && (
          <text>
            <span color="green">Agent: </span>
            {streaming()}
          </text>
        )}
        {activeTool() && (
          <text>
            <span color="yellow">[{activeTool()}]</span>
          </text>
        )}
      </scrollbox>
      <box borderTop width="100%">
        <input
          placeholder={!ready() ? "Initializing context..." : busy() ? "Thinking..." : "You: "}
          disabled={busy() || !ready()}
          onSubmit={submit}
          width="100%"
        />
      </box>
    </box>
  );
}

render(() => <App />);