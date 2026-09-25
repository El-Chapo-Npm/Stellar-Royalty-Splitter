import { db, countWrite } from "./core.js";

function tokens(value) {
  return new Set(
    String(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1)
  );
}

export function indexDocument({ entityType, entityId, title, body, metadata = {} }) {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO search_documents (entityType, entityId, title, body, metadata, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(entityType, entityId) DO UPDATE SET title=excluded.title, body=excluded.body, metadata=excluded.metadata, updatedAt=excluded.updatedAt
  `
  ).run(entityType, String(entityId), title, body, JSON.stringify(metadata), now);
  db.prepare("DELETE FROM search_documents_fts WHERE entityType = ? AND entityId = ?").run(
    entityType,
    String(entityId)
  );
  db.prepare(
    "INSERT INTO search_documents_fts(entityType, entityId, title, body) VALUES (?, ?, ?, ?)"
  ).run(entityType, String(entityId), title, body);
  countWrite();
  return { entityType, entityId: String(entityId), title, body, metadata, updatedAt: now };
}

export function searchDocuments(query, { entityType, limit = 25 } = {}) {
  const normalized = String(query ?? "").trim();
  if (!normalized) return [];
  const queryTokens = tokens(normalized);
  const ftsQuery = [...queryTokens].map((token) => `"${token.replaceAll('"', "")}"`).join(" OR ");
  let rows = [];
  if (ftsQuery) {
    rows = db
      .prepare(
        `
      SELECT d.*, bm25(search_documents_fts) AS textScore
      FROM search_documents_fts f JOIN search_documents d ON d.entityType = f.entityType AND d.entityId = f.entityId
      WHERE search_documents_fts MATCH ? ${entityType ? "AND d.entityType = ?" : ""}
      ORDER BY textScore LIMIT ?
    `
      )
      .all(...(entityType ? [ftsQuery, entityType, limit] : [ftsQuery, limit]));
  }
  if (rows.length < limit) {
    const like = `%${normalized.replaceAll("%", "")}%`;
    const fallback = db
      .prepare(
        `SELECT * FROM search_documents WHERE (title LIKE ? OR body LIKE ?) ${entityType ? "AND entityType = ?" : ""} LIMIT ?`
      )
      .all(...(entityType ? [like, like, entityType, limit] : [like, like, limit]));
    const seen = new Set(rows.map((row) => row.id));
    rows.push(...fallback.filter((row) => !seen.has(row.id)));
  }
  return rows
    .slice(0, limit)
    .map((row) => {
      const overlap = [...queryTokens].filter((token) =>
        tokens(`${row.title} ${row.body}`).has(token)
      ).length;
      return {
        ...row,
        metadata: JSON.parse(row.metadata || "{}"),
        semanticScore: queryTokens.size ? overlap / queryTokens.size : 0,
      };
    })
    .sort((a, b) => b.semanticScore - a.semanticScore);
}
