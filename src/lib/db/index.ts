import "server-only";
import path from "node:path";
import fs from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "ablelaw.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 개발 중 HMR 로 인스턴스가 중복 생성되는 것을 방지
const globalForDb = globalThis as unknown as {
  __libsql?: Client;
  __drizzle?: LibSQLDatabase<typeof schema>;
  __ready?: Promise<void>;
};

const client: Client = globalForDb.__libsql ?? createClient({ url: `file:${DB_FILE}` });
export const db: LibSQLDatabase<typeof schema> =
  globalForDb.__drizzle ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__libsql = client;
  globalForDb.__drizzle = db;
}

export { schema };

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS researches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  facts TEXT NOT NULL,
  facts_anonymized TEXT,
  question TEXT NOT NULL,
  field TEXT,
  sources TEXT NOT NULL DEFAULT '[]',
  anonymize INTEGER NOT NULL DEFAULT 0,
  deep_search INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS research_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_id INTEGER NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  confirmed_facts TEXT NOT NULL DEFAULT '[]',
  unclear_facts TEXT NOT NULL DEFAULT '[]',
  key_issues TEXT NOT NULL DEFAULT '[]',
  agencies TEXT NOT NULL DEFAULT '[]',
  keywords TEXT NOT NULL DEFAULT '[]',
  keyword_combos TEXT NOT NULL DEFAULT '[]',
  recommended_sources TEXT NOT NULL DEFAULT '[]',
  followup_questions TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS source_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_id INTEGER NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  agency TEXT,
  source_id TEXT,
  title TEXT NOT NULL,
  case_number TEXT,
  decision_date TEXT,
  summary TEXT,
  original_text TEXT,
  related_laws TEXT NOT NULL DEFAULT '[]',
  source_url TEXT,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  ai_similarities TEXT NOT NULL DEFAULT '[]',
  ai_differences TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS research_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_id INTEGER NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  question_summary TEXT,
  favorable_points TEXT NOT NULL DEFAULT '[]',
  unfavorable_points TEXT NOT NULL DEFAULT '[]',
  additional_checks TEXT NOT NULL DEFAULT '[]',
  expert_questions TEXT NOT NULL DEFAULT '[]',
  overall_review TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
`;

function ensure(): Promise<void> {
  if (!globalForDb.__ready) {
    globalForDb.__ready = (async () => {
      await client.executeMultiple(SCHEMA_SQL);
    })();
  }
  return globalForDb.__ready;
}

/** 스키마 보장 후 drizzle 인스턴스를 반환 */
export async function getDb(): Promise<LibSQLDatabase<typeof schema>> {
  await ensure();
  return db;
}
