import { DatabaseSync } from "node:sqlite";
import { CLAUSES, DOCS, type Clause } from "./seed.ts";

export type Db = DatabaseSync;

export function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE clauses (id TEXT PRIMARY KEY, doc TEXT, title TEXT, text TEXT);
           CREATE VIRTUAL TABLE clauses_fts USING fts5(id UNINDEXED, title, text);`);
  const ins = db.prepare("INSERT INTO clauses VALUES (?,?,?,?)");
  const insFts = db.prepare("INSERT INTO clauses_fts (id,title,text) VALUES (?,?,?)");
  for (const c of CLAUSES) {
    ins.run(c.id, c.doc, c.title, c.text);
    insFts.run(c.id, c.title, c.text);
  }
  return db;
}

const STOP = new Set(["the","a","an","of","to","is","are","and","or","in","on","for","how","what","does","do","can","be","by","at","it","this","that","with","much","many","if","my"]);

export function toFtsQuery(q: string): string {
  const toks = (q.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => !STOP.has(t));
  return toks.map((t) => `"${t}"`).join(" OR ");
}

export function searchClauses(db: Db, query: string, limit = 5) {
  const fts = toFtsQuery(query);
  if (!fts) return [];
  const rows = db
    .prepare(`SELECT id, title, snippet(clauses_fts, 2, '[', ']', '...', 12) AS snippet
              FROM clauses_fts WHERE clauses_fts MATCH ? ORDER BY bm25(clauses_fts) LIMIT ?`)
    .all(fts, limit) as { id: string; title: string; snippet: string }[];
  return rows;
}

export function getClause(db: Db, id: string): Clause | null {
  const r = db.prepare("SELECT id, doc, title, text FROM clauses WHERE id = ?").get(id);
  return (r as unknown as Clause) ?? null;
}

export function listDocuments(): { key: string; name: string }[] {
  return Object.entries(DOCS).map(([key, name]) => ({ key, name }));
}
