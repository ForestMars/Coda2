process.stdout.write = process.stderr.write.bind(process.stderr);
import { render } from "@opentui/solid";
import { createSignal, For, onMount } from "solid-js";
import {
  OpenFeature,
  MultiProvider,
  FirstSuccessfulStrategy,
} from "@openfeature/server-sdk";

import { ProtocolResolver } from "@sup/lib/protocol-resolver";
import { AgentRuntime } from "@sup/lib";
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
  const [currentModel, setCurrentModel] = createSignal("Detecting...");

  let inputRef: any;
  
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
        const { codingAgent, codingAgentModelSpec } = await import("@sup/agents/coding-agent");
        currentAgent = codingAgent;
        // Extracted structural metadata details safely from imports
        setCurrentModel(codingAgentModelSpec);
      } else {
        const { supportAgent, supportAgentModelSpec } = await import("@sup/agents/support-agent");
        currentAgent = supportAgent;
        setCurrentModel(supportAgentModelSpec?.name);
      }

      setReady(true);
      setTimeout(() => inputRef?.focus(), 0);
    } catch (e) {
      setCurrentModel("Fallback-LLM");
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
      const runtime = new AgentRuntime({
        name: AGENT,
        sessionId: session.id,
        input: text,
      });

      const generator = currentAgent(text, session, {
        resolver: ProtocolResolver,
        tools: adapters,
      });

      await runtime.run(() => generator, {
        onStep: (step) => {
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
        },
        onSpan: (span) => {
          if (span.name === "reasoning") {
            setActiveTool(`reasoning: ${span.message}`);
          } else if (span.name === "tool") {
            setActiveTool(span.message);
          }
        },
      });
    } catch (err) {
      setMessages((m) => [...m, { role: "agent", text: `Error: ${err}` }]);
    }

    setBusy(false);
  }

  return (
    <box width="100%" height="100%" flexDirection="column" borderStyle="single" borderColor="dim">
      
      {/* 1. Global App Header */}
      <box height={3} borderStyle="single" borderBottom width="100%" flexDirection="row" alignItems="center" paddingLeft={1} paddingRight={1}>
        <text bold color="magenta">SUP // </text>
        <text bold color="white">WORKSPACE CONTROL PANEL</text>
        <box flexGrow={1} />
        <text color={ready() ? "green" : "yellow"}>
          {ready() ? "● ACTIVE CONTEXT" : "○ SYNCING ENVIRONMENT"}
        </text>
      </box>
      
      {/* 2. Main Middle Deck (Splits layout horizontally) */}
      <box flexGrow={1} flexShrink={1} width="100%" flexDirection="row">
        
        {/* Left Side: Scrollable Conversation Field */}
        <scrollbox flexGrow={1} flexShrink={1} height="100%" paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
          <For each={messages()}>
            {(msg) => (
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
          
          {streaming() && (
            <box flexDirection="column" marginBottom={1} width="100%">
              <text bold color="green">❯ Agent</text>
              <box paddingLeft={2} width="100%">
                <text wrap="wrap" color="white">{streaming()}</text>
              </box>
            </box>
          )}
        </scrollbox>

        {/* Right Side: Sidebar Meta Deck Panel */}
        <box 
          width={28} 
          height="100%" 
          flexDirection="column" 
          borderStyle="single" 
          borderLeft 
          paddingLeft={1} 
          paddingRight={1}
          paddingTop={1}
        >
          <text bold color="magenta" marginBottom={1}>[ AGENT SPEC ]</text>
          
          <text color="gray">Type:</text>
          <text color="white" bold marginBottom={1}>{AGENT.toUpperCase()}</text>
          
          <text color="gray">Engine Model:</text>
          <text color="cyan" wrap="wrap" marginBottom={1}>{currentModel()}</text>
          
          <text color={busy() ? "yellow" : "green"} marginBottom={1}>
            {busy() ? "⚡ Processing" : "💤 Idle"}
          </text>
          
          <text color="gray" marginTop={1}>Telemetry Log:</text>
          {activeTool() ? (
            <box flexDirection="column" marginTop={1}>
              <text color="yellow" bold>» Tool Invoked</text>
              <text color="gray" wrap="wrap">[{activeTool()}]</text>
            </box>
          ) : (
            <text color="dim" italic marginTop={1}>Listening...</text>
          )}
        </box>
      </box>

      {/* 3. Action Input Base Footer */}
      <box height={3} borderStyle="single" borderTop width="100%" flexDirection="row" alignItems="center" paddingLeft={1}>
        <text color={busy() ? "yellow" : "cyan"} bold>{busy() ? " ⧗ " : " ❯ "}</text>
        <input
          ref={inputRef}
          placeholder={!ready() ? "Warming infrastructure..." : busy() ? "Processing inference data..." : "Write context or query..."}
          disabled={busy() || !ready()}
          onSubmit={submit}
          width="100%"
        />
      </box>
    </box>
  );
}

render(() => <App />);