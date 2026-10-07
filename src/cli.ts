import Anthropic from "@anthropic-ai/sdk";
import { openDb } from "./db.ts";
import { runAgent, type LLMClient } from "./agent.ts";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error('Usage: npm run ask -- "your question"');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Export it in your shell first.");
  process.exit(1);
}

// Only needed if your key is not scoped to a single workspace.
const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
const sdk = new Anthropic(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {});
const client: LLMClient = {
  create: (p) => sdk.messages.create(p as never) as never,
};

const r = await runAgent({ client, db: openDb(), question, model: process.env.CLAUSECHECK_MODEL });
console.log(r.answer);
console.error(`\n[turns=${r.turns} tools=${r.toolCalls.map((t) => t.name).join(",")} opened=${r.openedIds.join(",")}]`);
