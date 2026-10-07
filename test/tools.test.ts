import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb, toFtsQuery } from "../src/db.ts";
import { executeTool } from "../src/tools.ts";

test("toFtsQuery drops stopwords and ORs quoted tokens", () => {
  assert.equal(toFtsQuery("How much notice is needed"), '"notice" OR "needed"');
  assert.equal(toFtsQuery("the of"), "");
});

test("search finds the renewal clause", () => {
  const r = executeTool(openDb(), "search_clauses", { query: "auto-renewing notice" });
  assert.ok(r.seen.includes("SAAS-2.1"));
  assert.deepEqual(r.opened, []);
});

test("search does not mark clauses as opened", () => {
  const r = executeTool(openDb(), "search_clauses", { query: "interest overdue" });
  assert.equal(r.opened.length, 0);
});

test("get_clause opens a clause", () => {
  const r = executeTool(openDb(), "get_clause", { id: "NDA-4" });
  assert.deepEqual(r.opened, ["NDA-4"]);
  assert.match(r.content, /three \(3\) years/);
});

test("unknown clause id is an error result, not an exception", () => {
  const r = executeTool(openDb(), "get_clause", { id: "NOPE-1" });
  assert.equal(r.isError, true);
});

test("bad input and unknown tool are error results", () => {
  const db = openDb();
  assert.equal(executeTool(db, "search_clauses", {}).isError, true);
  assert.equal(executeTool(db, "get_clause", { id: 5 }).isError, true);
  assert.equal(executeTool(db, "frobnicate", {}).isError, true);
});

test("no-match search returns a plain message", () => {
  const r = executeTool(openDb(), "search_clauses", { query: "zebra" });
  assert.equal(r.content, "No matching clauses.");
});
