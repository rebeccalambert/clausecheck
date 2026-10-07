import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.ts";
import { parseCitations, runAgent, type Block, type LLMClient } from "../src/agent.ts";
import { scoreCase } from "../src/score.ts";

function scripted(turns: Block[][]): LLMClient {
  let i = 0;
  return {
    async create() {
      const content = turns[Math.min(i++, turns.length - 1)];
      return { content, stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn" };
    },
  };
}
const use = (id: string, name: string, input: unknown): Block => ({ type: "tool_use", id, name, input });
const text = (t: string): Block => ({ type: "text", text: t });

test("parseCitations", () => {
  assert.deepEqual(parseCitations("Yes.\nCITATIONS: SAAS-2.1, NDA-4"), ["SAAS-2.1", "NDA-4"]);
  assert.deepEqual(parseCitations("No.\nCITATIONS: none"), []);
  assert.equal(parseCitations("no line"), null);
});

test("search, open, answer: grounded citation passes", async () => {
  const client = scripted([
    [use("t1", "search_clauses", { query: "renewal notice" })],
    [use("t2", "get_clause", { id: "SAAS-2.1" })],
    [text("60 days.\nCITATIONS: SAAS-2.1")],
  ]);
  const r = await runAgent({ client, db: openDb(), question: "q" });
  assert.equal(r.turns, 3);
  const s = scoreCase({ id: "x", question: "q", expectCitations: ["SAAS-2.1"], mustInclude: ["60"] }, r);
  assert.equal(s.pass, true, s.failures.join(";"));
});

test("citing a clause that was only seen in search fails grounding", async () => {
  const client = scripted([
    [use("t1", "search_clauses", { query: "renewal notice" })],
    [text("60 days.\nCITATIONS: SAAS-2.1")],
  ]);
  const r = await runAgent({ client, db: openDb(), question: "q" });
  const s = scoreCase({ id: "x", question: "q", expectCitations: ["SAAS-2.1"] }, r);
  assert.equal(s.pass, false);
  assert.match(s.failures.join(";"), /ungrounded/);
});

test("declining with no citations passes; citing on a decline case fails", async () => {
  const ok = await runAgent({ client: scripted([[text("Not addressed.\nCITATIONS: none")]]), db: openDb(), question: "q" });
  assert.equal(scoreCase({ id: "d", question: "q", expectCitations: [] }, ok).pass, true);
  const bad = await runAgent({
    client: scripted([[use("t1", "get_clause", { id: "SAAS-9.1" })], [text("Cap.\nCITATIONS: SAAS-9.1")]]),
    db: openDb(), question: "q",
  });
  assert.equal(scoreCase({ id: "d", question: "q", expectCitations: [] }, bad).pass, false);
});

test("turn limit stops a tool loop", async () => {
  const client = scripted([[use("t", "list_documents", {})]]);
  const r = await runAgent({ client, db: openDb(), question: "q", maxTurns: 3 });
  assert.equal(r.hitTurnLimit, true);
  assert.equal(r.turns, 3);
});

test("tool errors are returned to the model, not thrown", async () => {
  const client = scripted([[use("t1", "get_clause", { id: "NOPE" })], [text("Not found.\nCITATIONS: none")]]);
  const r = await runAgent({ client, db: openDb(), question: "q" });
  assert.equal(r.turns, 2);
  assert.equal(r.openedIds.length, 0);
});

test("assistant message is appended before its tool results", async () => {
  const seenMessages: string[][] = [];
  let i = 0;
  const client: LLMClient = {
    async create(p) {
      seenMessages.push(p.messages.map((m) => m.role));
      return i++ === 0
        ? { content: [use("t1", "list_documents", {})], stop_reason: "tool_use" }
        : { content: [text("ok\nCITATIONS: none")], stop_reason: "end_turn" };
    },
  };
  await runAgent({ client, db: openDb(), question: "q" });
  assert.deepEqual(seenMessages[1], ["user", "assistant", "user"]);
});
