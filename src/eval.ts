import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { openDb } from "./db.ts";
import { runAgent, type LLMClient } from "./agent.ts";
import { scoreCase, type EvalCase } from "./score.ts";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Export it in your shell first.");
  process.exit(1);
}
// Only needed if your key is not scoped to a single workspace.
const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
const sdk = new Anthropic(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {});
const client: LLMClient = { create: (p) => sdk.messages.create(p as never) as never };
const model = process.env.CLAUSECHECK_MODEL ?? "claude-sonnet-5-5";
const runs = Number(process.env.EVAL_RUNS ?? 1);
const cases: EvalCase[] = JSON.parse(readFileSync(new URL("../evals/questions.json", import.meta.url), "utf8"));

// let pass = 0, total = 0;
// for (const c of cases) {
//   for (let i = 0; i < runs; i++) {
//     const r = await runAgent({ client, db: openDb(), question: c.question, model });
//     const s = scoreCase(c, r);
//     total++; if (s.pass) pass++;
//     console.log(`${s.pass ? "PASS" : "FAIL"} ${c.id} (run ${i + 1})${s.pass ? "" : " :: " + s.failures.join("; ")}`);
//   }
// }

let pass = 0, total = 0;
const only = process.env.EVAL_ONLY;
for (const c of cases.filter((c) => !only || c.id === only)) {
  for (let i = 0; i < runs; i++) {
    const r = await runAgent({ client, db: openDb(), question: c.question, model });
    const s = scoreCase(c, r);
    total++; if (s.pass) pass++;
    console.log(`${s.pass ? "PASS" : "FAIL"} ${c.id} (run ${i + 1})${s.pass ? "" : " :: " + s.failures.join("; ") + "\n    ANSWER: " + r.answer}`);  
  }
}

console.log(`\n${pass}/${total} passed (${Math.round((100 * pass) / total)}%) model=${model} runs=${runs}`);
