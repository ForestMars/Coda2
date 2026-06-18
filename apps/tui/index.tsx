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
    // Outer App Frame with background and single border
    <box width="100%" height="100%" flexDirection="column" borderStyle="single" borderColor="dim">
      
      {/* 1. Header Row */}
      <box height={3} borderStyle="single" borderBottom width="100%" flexDirection="row" alignItems="center" paddingLeft={1} paddingRight={1}>
        <text bold color="magenta">SUP // </text>
        <text bold color="white">{AGENT.toUpperCase()} AGENT</text>
        <box flexGrow={1} />
        <text color={ready() ? "green" : "yellow"}>
          {ready() ? "● ONLINE" : "○ INITIALIZING"}
        </text>
      </box>
      
      {/* 2. Main Chat Workspace Container */}
      <scrollbox flexGrow={1} flexShrink={1} width="100%" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
        <For each={messages()}>
          {(msg) => (
            // Indented and bottom-margined block for structured bubbles
            <box flexDirection="column" marginBottom={1} width="100%">
              <text bold color={msg.role === "user" ? "cyan" : "green"}>
                {msg.role === "user" ? "❯ You" : "❯ Agent"}
              </text>
              <box paddingLeft={2} width="100%">
                <text wrap="wrap" color="white">{msg.text}</text>
              </box>
            </box>
          )}
        </For>
        
        {/* Streaming Block */}
        {streaming() && (
          <box flexDirection="column" marginBottom={1} width="100%">
            <text bold color="green">❯ Agent</text>
            <box paddingLeft={2} width="100%">
              <text wrap="wrap" color="white">{streaming()}</text>
            </box>
          </box>
        )}
        
        {/* Active System/Tool Traces */}
        {activeTool() && (
          <box flexDirection="row" alignItems="center" marginTop={1} marginBottom={1}>
            <text color="yellow" dim>⠋ Executing tool: </text>
            <text color="yellow" bold>[{activeTool()}]</text>
          </box>
        )}
      </scrollbox>

      {/* 3. Action Input Row */}
      <box height={3} borderStyle="single" borderTop width="100%" flexDirection="row" alignItems="center" paddingLeft={1}>
        <text color={busy() ? "yellow" : "cyan"} bold>{busy() ? " ⧗ " : " ❯ "}</text>
        <input
          placeholder={!ready() ? "Initializing context modules..." : busy() ? "Analyzing stream..." : "Ask your agent anything..."}
          disabled={busy() || !ready()}
          onSubmit={submit}
          width="100%"
        />
      </box>
    </box>
  );
}

render(() => <App />);