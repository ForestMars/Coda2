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
  
  let currentAgent: any = null;

  onMount(async () => {
    try {
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

      if (AGENT === "coding") {
        const { codingAgent } = await import("@sup/agents/coding-agent");
        currentAgent = codingAgent;
      } else {
        const { supportAgent } = await import("@sup/agents/support-agent");
        currentAgent = supportAgent;
      }

      setReady(true);
    } catch (e) {
      setReady(true); 
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
    // FIX 1: Flex direction must be explicitly coupled with absolute terminal view bounds
    <box width="100%" height="100%" flexDirection="column">
      
      {/* FIX 2: Added specific flex shrink & grow mechanics to prevent infinite rendering loops */}
      <scrollbox flexGrow={1} flexShrink={1} width="100%">
        <For each={messages()}>
          {(msg) => (
            // FIX 3: Text wrapping. If the agent outputs long text without wrap instructions, the terminal calculation freezes
            <text wrap="wrap">
              <span color={msg.role === "user" ? "cyan" : "green"}>
                {msg.role === "user" ? "You" : "Agent"}:{" "}
              </span>
              {msg.text}
            </text>
          )}
        </For>
        
        {streaming() && (
          <text wrap="wrap">
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

      {/* FIX 4: Solid height boundaries on input row prevents the TUI from recursively recalculating heights */}
      <box height={3} borderStyle="single" borderTop width="100%" flexDirection="row" alignItems="center">
        <text color="gray"> </text>
        <input
          placeholder={!ready() ? "Initializing..." : busy() ? "Thinking..." : "Type a message..."}
          disabled={busy() || !ready()}
          onSubmit={submit}
          width="100%"
        />
      </box>
    </box>
  );
}

render(() => <App />);