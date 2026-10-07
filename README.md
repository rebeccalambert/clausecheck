# ClauseCheck

A small tool-using LLM agent in TypeScript that answers questions about contracts and cites the clauses it relied on. A built-in eval suite checks that every citation was actually retrieved, so the agent can't cite a clause it never read.

The contracts in `src/seed.ts` are fictional sample text written for this demo.

## Run it

Requires Node 22.5+ (uses the built-in `node:sqlite`).

```bash
npm install
export ANTHROPIC_API_KEY=...        # see .env.example; the scripts do not read a .env file
npm test                            # unit tests, no API calls
npm run ask -- "How much notice is needed to stop the SaaS agreement from auto-renewing?"
npm run eval                        # 11 questions against the real model
EVAL_RUNS=3 npm run eval            # repeat each question to see how stable results are
EVAL_ONLY=decline-noncompete EVAL_RUNS=20 npm run eval   # repeat a single case
```

If the API returns "not scoped to a workspace", either create the key with a workspace selected or set `ANTHROPIC_WORKSPACE_ID`.

## How it works

1. The question goes to the model with a system prompt (`src/agent.ts`) and three tools (`src/tools.ts`): `search_clauses`, `get_clause`, `list_documents`.
2. When the model replies with a `tool_use` block, `executeTool` runs it against a SQLite database (`src/db.ts`) and the result goes back as a `tool_result`. This repeats until the model replies with plain text.
3. The final answer must end with a `CITATIONS:` line. `src/score.ts` checks it against what the agent actually read.

## Design decisions

- **Search, then open.** Search returns partial snippets, so the prompt requires `get_clause` on anything the answer relies on. The eval fails any citation that was never opened. This is the check for hallucinated citations.
- **Declining is a first-class outcome.** Three of the eval questions have no answer in the contracts, and the agent must say so and cite nothing.
- **Turn limit.** The loop stops after 6 model calls, so a model that keeps calling tools can't run forever.
- **Tool errors go back to the model.** Bad input or an unknown clause id comes back as an `is_error` tool result, not an exception, so the model can recover.
- **Keyword search (SQLite FTS5), not embeddings.** For 13 short clauses, BM25 keyword search is simple and inspectable. The tradeoff is vocabulary mismatch (a question that says "cancel" won't match a clause that says "terminate"). See Stretch.

## Failure modes

| Failure | What I did about it |
|---|---|
| Cites a clause it never read | Grounding check in `scoreCase` |
| Answers from a partial snippet | Prompt rule 1, plus the grounding check |
| Invents an answer when nothing matches | Prompt rule 3, plus eval cases that must decline |
| Noisy retrieval returns irrelevant clauses | The "non-compete" eval case: keyword hits exist but none answer it |
| Cites a related clause while declining (found by repeated runs) | Tightened prompt rules 3 and 7; see Eval results |
| Instructions hidden in document text | Prompt rule 4 treats clause text as data (not tested adversarially yet) |
| Runaway tool loop | Turn limit |
| Non-deterministic results | `EVAL_RUNS` repeats each question |
| Scorer rejects a correct answer worded differently | Found in `nda-survival` ("three" vs "3"); `mustInclude` now accepts alternatives |

## Eval results

| Date | Model | Runs | Pass rate | Notes |
|---|---|---|---|---|
| 2026-10-07 | claude-sonnet-5-5 | 3 per question (33 total) | 32/33 (97%) | Baseline. One failure: `decline-noncompete` cited NDA-3 |
| 2026-10-07 | claude-sonnet-5-5 | 10 (`decline-noncompete` only) | 9/10 | Baseline. Same failure, cited NDA-3 |
| 2026-10-07 | claude-sonnet-5-5 | 10 (`decline-noncompete` only) | 10/10 | Baseline. No failures this batch |
| 2026-10-07 | claude-sonnet-5-5 | 10 (`decline-noncompete` only) | 7/10 | Baseline. Three failures, all cited NDA-3 |
| 2026-10-07 | claude-sonnet-5-5 | 20 (`decline-noncompete` only) | 20/20 | After prompt change |
| 2026-10-07 | claude-sonnet-5-5 | 3 per question (33 total) | 31/33 (94%) | After prompt change. Both failures were `nda-survival` (scorer issue, see Scorer fix) |
| 2026-10-07 | claude-sonnet-5-5 | 3 per question (33 total) | 33/33 (100%) | After scorer fix (`mustInclude` accepts alternatives like `3\|three`). Same prompt as the previous row |

Across the four baseline batches, `decline-noncompete` passed 28 of 33 runs (85%). After the prompt change it passed 26 of 26 runs (20/20 in a dedicated batch, plus 3/3 in each of two full runs).

### What failed

`decline-noncompete` failed intermittently (about 15% of baseline runs, with batches of 10 ranging from 7/10 to 10/10). In every failure the answer text was accurate: the agent said no non-compete exists, called NDA-3 the "closest provision," and said NDA-3 doesn't restrict who either party may work with. But the `CITATIONS:` line still listed NDA-3, which breaks the rule that a decline cites nothing. The grounding check passed because the agent had opened NDA-3; the problem was citing a clause that doesn't support any answer.

### Why I think it happened

The non-compete question has no matching clause, so keyword search returned loosely related hits (for example, "non" matched `non-refundable` and `non-renewal`). NDA-3 limits how confidential information may be used, which is close to what the question is about, and the model sometimes cited it as the nearest match instead of citing nothing. I confirmed this by printing the full answer on failures.

### What I changed

Tightened two rules in the system prompt:

- Rule 3: if the clauses do not directly answer the question, say so. The agent may mention that a related clause exists but must not cite it.
- Rule 7: the `CITATIONS:` line lists only clauses that support the answer. When declining it must be `CITATIONS: none`, even if a related clause was mentioned in the text.

Result: 20/20 on `decline-noncompete`, versus 85% at baseline. If the old 15% failure rate still applied, 20 clean runs in a row would happen about 4% of the time, so I think the change helped, though 20 runs is still a small sample.

### Scorer fix

In the full run after the prompt change, `nda-survival` failed twice because the scorer required the literal text "3" and the agent wrote "three years." The answer and citation (NDA-4) were correct, so this was a scorer problem, not a model problem. I changed `mustInclude` so each entry can list alternatives separated by `|` (for example `"3|three"`), and any one match counts. The next full run passed 33/33. I kept the 94% row in the table because it shows the original problem. The fix makes the check accept equivalent wordings; it does not make it any less strict about the fact itself.

### What I learned

- One batch of 10 runs can't tell a fix from noise. A 15% failure rate still produces a clean 10/10 batch about 1 time in 5 (the baseline had exactly that), and a bad batch like 7/10 about 1 time in 20 or so.
- Reading the full failing answers changed my diagnosis. The model was right about the contract and wrong about the output format.
- Re-running the full suite after the prompt change turned up a different problem (the scorer), which a decline-only re-run would have missed.
- 33/33 at 3 runs per question is encouraging but not proof of stability; the baseline showed a 15% failure case can hide in a small batch. Next step would be a larger `EVAL_RUNS` on the full suite.

### Limits of this eval

- 11 questions over 13 fictional clauses is a small sample, so a pass rate here says little about real contracts.
- Scoring checks citations and key facts with literal text matching, not the quality of the wording.
- Keyword search only matches exact words. I haven't tested paraphrased questions ("cancel" instead of "terminate").

## Stretch

1. **Embeddings / hybrid retrieval.** Anthropic doesn't offer an embeddings endpoint, so use a separate provider (Voyage AI is the one Anthropic recommends) or a local model. Add eval questions that paraphrase ("cancel" instead of "terminate") and compare recall@5 for keyword vs embeddings vs both.
2. **Thin React front end** over the same agent, so it reads as a full-stack project.
3. **Prompt version flag** to compare two system prompts on the same eval set.

## Be able to explain (in your own words)

- **System prompt:** what each rule is for and which eval case would catch its removal.
- **Tool calls:** the `tool_use` / `tool_result` round trip, and why the loop appends the assistant message before the results.
- **Embeddings:** what they are and when they beat keyword search. Only describe your own results here if you built the stretch.
- **Failure points:** pick two from the table above and describe how you found them.