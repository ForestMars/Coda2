import { render } from "@opentui/solid";
import { createSignal } from "solid-js";
import { For } from "solid-js";
import {
  OpenFeature,
  MultiProvider,
  FirstSuccessfulStrategy,
} from "@openfeature/server-sdk";

import { ProtocolResolver } from "@sup/lib/protocol-resolver";
import { adapters } from "@sup/tools";
import { JsonFileProvider } from "@sup/infra/adapters/JsonFileProvider";

const AGENT = process.env.AGENT || "support";
const { agent, modelSpec } = await (async () => {
  if (AGENT === "coding") {
    const { codingAgent, codingAgentModelSpec } = await import("@sup/agents/coding-agent");
    return { agent: codingAgent, modelSpec: codingAgentModelSpec };
  }
  const { supportAgent, supportAgentModelSpec } = await import("@sup/agents/support-agent");
  return { agent: supportAgent, modelSpec: supportAgentModelSpec };
})();

/* 
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
*/ 

const session: AgentSession = {
  id: "tui-session-" + Date.now(),
  events: [],
};

type Message = { role: "user" | "agent"; text: string };

function App() {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [streaming, setStreaming] = createSignal("");
  const [activeTool, setActiveTool] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function submit(text: string) {
    if (!text.trim() || busy()) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);

    const generator = agent(text, session, {
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
              <br />
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
          placeholder={busy() ? "..." : "You: "}
          disabled={busy()}
          onSubmit={submit}
          width="100%"
        />
      </box>
    </box>
  );
}

render(() => <App />);
