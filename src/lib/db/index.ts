import "server-only";
import path from "node:path";
import fs from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "ablelaw.db");

/**
 * DB 연결 설정 결정:
 * - Turso(클라우드): DATABASE_URL(또는 TURSO_DATABASE_URL)이 libsql:// 또는 https:// 이면 사용.
 *   인증 토큰은 DATABASE_AUTH_TOKEN(또는 TURSO_AUTH_TOKEN).
 * - 그 외(로컬 개발): data/ablelaw.db 파일 사용.
 * Vercel 등 서버리스 환경은 파일시스템이 임시/읽기전용이므로 반드시 Turso를 사용해야 합니다.
 */
function resolveDbConfig(): { url: string; authToken?: string } {
  const remoteUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  if (remoteUrl && /^(libsql|https|wss):\/\//.test(remoteUrl)) {
    return {
      url: remoteUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
    };
  }
  // 로컬 파일 모드: 프로젝트 data/ 를 우선 시도.
  // Vercel 등 서버리스는 프로젝트 경로가 읽기전용이라 쓰기가 실패하므로,
  // 그럴 때는 유일하게 쓰기 가능한 /tmp 로 폴백한다.
  // (⚠️ /tmp 는 인스턴스마다 분리되고 콜드스타트 시 사라지는 임시 저장소 —
  //  데이터 영속이 필요하면 DATABASE_URL 로 Turso 를 지정할 것)
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    return { url: `file:${DB_FILE}` };
  } catch {
    const tmpDir = path.join("/tmp", "ablelaw-data");
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    } catch {
      /* /tmp 생성 실패 시 그대로 진행 (createClient 가 에러를 던짐) */
    }
    return { url: `file:${path.join(tmpDir, "ablelaw.db")}` };
  }
}

const dbConfig = resolveDbConfig();

// 개발 중 HMR 로 인스턴스가 중복 생성되는 것을 방지
const globalForDb = globalThis as unknown as {
  __libsql?: Client;
  __drizzle?: LibSQLDatabase<typeof schema>;
  __ready?: Promise<void>;
};

const client: Client = globalForDb.__libsql ?? createClient(dbConfig);
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
