import { render } from "@opentui/solid";
import { createSignal, createEffect, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";

type Message = { role: "user" | "agent"; text: string };

function App({ agent, session, resolver, adapters }) {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [streaming, setStreaming] = createSignal("");
  const [activeTool, setActiveTool] = createSignal("");

  async function submit() {
    const text = input();
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");

    const generator = agent(text, session, { resolver, tools: adapters });

    for await (const step of generator) {
      if (step.type === "text_delta" && step.delta) {
        setStreaming((s) => s + step.delta);
      } else if (step.type === "tool_call") {
        setActiveTool(step.toolId);
      } else if (step.type === "tool_result") {
        setActiveTool("");
      } else if (step.type === "final") {
        setMessages((m) => [...m, { role: "agent", text: step.text || streaming() }]);
        setStreaming("");
        setActiveTool("");
      }
    }
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
            <span color="green">Agent: </span>{streaming()}
          </text>
        )}
        {activeTool() && (
          <text>
            <span color="yellow">[{activeTool()}] </span>
          </text>
        )}
      </scrollbox>
      <box borderTop width="100%">
        <input
          value={input()}
          onChange={(v) => setInput(v)}
          onSubmit={submit}
          placeholder="You: "
          width="100%"
        />
      </box>
    </box>
  );
}

export function startTUI({ agent, session, resolver, adapters }) {
  render(() => (
    <App
      agent={agent}
      session={session}
      resolver={resolver}
      adapters={adapters}
    />
  ));
}