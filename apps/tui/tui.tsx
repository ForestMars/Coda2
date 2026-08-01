/**
 * @file apps/tui/tui.tsx
 * @description TUI panel for Coda/Support Agent
 */
asdfghjkl; // BREAK THE BUILD
import { render, useKeyboard } from "@opentui/solid";
import { createSignal, For } from "solid-js";
import { AgentRuntime } from "@sup/lib";
import fs from "node:fs";
import path from "node:path";

// Write directly to current working directory to avoid /tmp permission/sandbox issues
const LOG_PATH = path.join(process.cwd(), "tui-debug.log");

function logDebug(msg: string) {
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err: any) {
    // If disk write fails, write raw to low-level file descriptor 2 (stderr)
    try {
      fs.writeSync(2, `[DEBUG_FALLBACK] ${msg}\n`);
    } catch {}
  }
}

type Message = { role: "user" | "agent"; text: string };

function App({ agent, session, resolver, adapters }: any) {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal("");
  const [streaming, setStreaming] = createSignal("");
  const [activeTool, setActiveTool] = createSignal("");

  async function submit() {
    const text = input();
    logDebug(`[submit] triggered with text: ${JSON.stringify(text)}`);

    if (!text.trim()) {
      logDebug("[submit] blocked: text is empty");
      return;
    }

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");

    try {
      const runtime = new AgentRuntime({
        name: "tui-agent",
        sessionId: session.id,
        input: text,
      });

      const generator = agent(text, session, { resolver, tools: adapters });

      await runtime.run(() => generator, {
        onStep: (step: any) => {
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
        },
        onSpan: (span: any) => {
          if (span.name === "reasoning") {
            setActiveTool(`reasoning: ${span.message}`);
          } else if (span.name === "tool") {
            setActiveTool(span.message);
          }
        },
      });
    } catch (err: any) {
      logDebug(`[runtime error] ${err?.message || err}`);
      setMessages((m) => [...m, { role: "agent", text: `Error: ${err?.message || err}` }]);
    }
  }

  // Bind OpenTUI keyboard listener at window/root level
  useKeyboard((key) => {
    logDebug(`[useKeyboard] key.name: ${JSON.stringify(key.name)}, full key: ${JSON.stringify(key)}`);
    if (key.name === "return" || key.name === "enter" || key.sequence === "\r" || key.sequence === "\n") {
      logDebug("[useKeyboard] Return detected - triggering submit()");
      submit();
    }
  });

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
          focused
          onInput={(val: string) => {
            setInput(val);
            logDebug(`[onInput] ${JSON.stringify(val)}`);
          }}
          onChange={(val: string) => {
            setInput(val);
            logDebug(`[onChange] ${JSON.stringify(val)}`);
          }}
          placeholder="You: "
          width="100%"
        />
      </box>
    </box>
  );
}

export function startTUI({ agent, session, resolver, adapters }: any) {
  logDebug("=== startTUI mounted ===");
  render(() => (
    <App
      agent={agent}
      session={session}
      resolver={resolver}
      adapters={adapters}
    />
  ));
}
