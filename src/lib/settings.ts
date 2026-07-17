import "server-only";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface AppSettings {
  lawApiOc: string;
  aiProvider: "anthropic" | "openai";
  anthropicApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string; // 절충안: 대량 호출용 Gemini 키
  geminiModel: string; // 대량 호출 모델 (기본 gemini-2.5-flash)
  aiModel: string;
  defaultDisplay: number; // 기본 검색 건수
  defaultSources: string[]; // 기본 검색 자료
  autoAnonymize: boolean; // 개인정보 자동 익명화
}

export interface PublicSettings {
  lawApiOc: string;
  aiProvider: "anthropic" | "openai";
  aiModel: string;
  geminiModel: string;
  defaultDisplay: number;
  defaultSources: string[];
  autoAnonymize: boolean;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
}

const KEYS = {
  lawApiOc: "LAW_API_OC",
  aiProvider: "AI_PROVIDER",
  anthropicApiKey: "ANTHROPIC_API_KEY",
  openaiApiKey: "OPENAI_API_KEY",
  geminiApiKey: "GEMINI_API_KEY",
  geminiModel: "GEMINI_MODEL",
  aiModel: "AI_MODEL",
  defaultDisplay: "DEFAULT_DISPLAY",
  defaultSources: "DEFAULT_SOURCES",
  autoAnonymize: "AUTO_ANONYMIZE",
} as const;

async function readRaw(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select().from(schema.appSettings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getSettings(): Promise<AppSettings> {
  const s = await readRaw();
  const provider = (s[KEYS.aiProvider] || process.env.AI_PROVIDER || "anthropic") as
    | "anthropic"
    | "openai";
  return {
    lawApiOc: s[KEYS.lawApiOc] ?? process.env.LAW_API_OC ?? "",
    aiProvider: provider === "openai" ? "openai" : "anthropic",
    anthropicApiKey: s[KEYS.anthropicApiKey] ?? process.env.ANTHROPIC_API_KEY ?? "",
    openaiApiKey: s[KEYS.openaiApiKey] ?? process.env.OPENAI_API_KEY ?? "",
    geminiApiKey: s[KEYS.geminiApiKey] ?? process.env.GEMINI_API_KEY ?? "",
    geminiModel: s[KEYS.geminiModel] ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    aiModel: s[KEYS.aiModel] ?? process.env.AI_MODEL ?? "claude-3-5-sonnet-latest",
    defaultDisplay: Number(s[KEYS.defaultDisplay] ?? "20") || 20,
    defaultSources: safeArr(s[KEYS.defaultSources]) ?? ["law", "prec"],
    autoAnonymize: (s[KEYS.autoAnonymize] ?? "true") === "true",
  };
}

/** 클라이언트로 전달해도 안전한(키를 마스킹한) 설정 */
export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    lawApiOc: s.lawApiOc,
    aiProvider: s.aiProvider,
    aiModel: s.aiModel,
    geminiModel: s.geminiModel,
    defaultDisplay: s.defaultDisplay,
    defaultSources: s.defaultSources,
    autoAnonymize: s.autoAnonymize,
    hasAnthropicKey: Boolean(s.anthropicApiKey),
    hasOpenaiKey: Boolean(s.openaiApiKey),
    hasGeminiKey: Boolean(s.geminiApiKey),
  };
}

export async function saveSettings(
  patch: Partial<Record<keyof typeof KEYS, string>>,
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined) as [
    keyof typeof KEYS,
    string,
  ][];
  for (const [k, v] of entries) {
    const key = KEYS[k];
    const existing = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, key));
    if (existing.length > 0) {
      await db
        .update(schema.appSettings)
        .set({ value: v, updatedAt: now })
        .where(eq(schema.appSettings.key, key));
    } else {
      await db.insert(schema.appSettings).values({ key, value: v, updatedAt: now });
    }
  }
}

function safeArr(v?: string): string[] | undefined {
  if (!v) return undefined;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}
