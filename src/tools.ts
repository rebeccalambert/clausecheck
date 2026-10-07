import { getClause, listDocuments, searchClauses, type Db } from "./db.ts";

export const TOOLS = [
  {
    name: "search_clauses",
    description: "Keyword search over contract clauses. Returns clause ids, titles and short snippets only. Snippets are partial: open a clause with get_clause before relying on it.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string", description: "Keywords to search for" } },
      required: ["query"],
    },
  },
  {
    name: "get_clause",
    description: "Fetch the full text of one clause by id (e.g. SAAS-2.1).",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "string", description: "Clause id" } },
      required: ["id"],
    },
  },
  {
    name: "list_documents",
    description: "List the contracts available to search.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

export interface ToolResult {
  content: string;
  seen: string[];
  opened: string[];
  isError?: boolean;
}

export function executeTool(db: Db, name: string, input: unknown): ToolResult {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "search_clauses": {
      if (typeof args.query !== "string" || !args.query.trim())
        return { content: "Error: 'query' must be a non-empty string.", seen: [], opened: [], isError: true };
      const hits = searchClauses(db, args.query);
      if (hits.length === 0) return { content: "No matching clauses.", seen: [], opened: [] };
      return {
        content: hits.map((h) => `${h.id} | ${h.title} | ${h.snippet}`).join("\n"),
        seen: hits.map((h) => h.id),
        opened: [],
      };
    }
    case "get_clause": {
      if (typeof args.id !== "string")
        return { content: "Error: 'id' must be a string.", seen: [], opened: [], isError: true };
      const c = getClause(db, args.id);
      if (!c) return { content: `Error: no clause with id '${args.id}'.`, seen: [], opened: [], isError: true };
      return { content: `${c.id} (${c.title}): ${c.text}`, seen: [c.id], opened: [c.id] };
    }
    case "list_documents":
      return { content: listDocuments().map((d) => `${d.key}: ${d.name}`).join("\n"), seen: [], opened: [] };
    default:
      return { content: `Error: unknown tool '${name}'.`, seen: [], opened: [], isError: true };
  }
}
