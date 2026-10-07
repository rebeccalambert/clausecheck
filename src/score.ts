import type { AgentResult } from "./agent.ts";

export interface EvalCase {
  id: string;
  question: string;
  expectCitations: string[]; // empty means the agent must decline
  mustInclude?: string[];    // facts that must appear in the answer (case-insensitive)
}

export function scoreCase(c: EvalCase, r: AgentResult): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  if (r.hitTurnLimit) failures.push("hit turn limit");
  if (r.citations === null) failures.push("missing CITATIONS line");
  const cited = r.citations ?? [];

  for (const id of cited) {
    if (!r.openedIds.includes(id)) failures.push(`ungrounded citation ${id} (never opened with get_clause)`);
  }

  if (c.expectCitations.length === 0) {
    if (cited.length > 0) failures.push(`should decline but cited ${cited.join(", ")}`);
  } else {
    for (const id of c.expectCitations) {
      if (!cited.includes(id)) failures.push(`missing expected citation ${id}`);
    }
    for (const f of c.mustInclude ?? []) {
      const options = f.split("|").map((s) => s.toLowerCase());
      if (!options.some((o) => r.answer.toLowerCase().includes(o))) failures.push(`answer missing fact "${f}"`);
    }
  }
  return { pass: failures.length === 0, failures };
}
