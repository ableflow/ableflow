"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResultActions({
  id,
  initialFavorite,
  initialTags,
}: {
  id: number;
  initialFavorite: boolean;
  initialTags: string[];
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/research/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function toggleFav() {
    const next = !favorite;
    setFavorite(next);
    await patch({ favorite: next });
  }

  async function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    await patch({ tags: next });
  }

  async function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    await patch({ tags: next });
  }

  async function remove() {
    if (!confirm("이 조사를 삭제할까요?")) return;
    await fetch(`/api/research/${id}`, { method: "DELETE" });
    router.push("/history");
  }

  return (
    <div className="no-print card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleFav} className="btn-ghost">
          {favorite ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}
        </button>
        <a href={`/api/research/${id}/export?format=md`} className="btn-ghost">
          Markdown 내보내기
        </a>
        <a href={`/api/research/${id}/export?format=json`} className="btn-ghost">
          JSON 내보내기
        </a>
        <button onClick={() => window.print()} className="btn-ghost">
          인쇄
        </button>
        <button onClick={remove} className="btn-ghost ml-auto text-red-600">
          삭제
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span key={t} className="chip bg-slate-100 text-slate-600">
            #{t}
            <button onClick={() => removeTag(t)} className="ml-1 text-slate-400 hover:text-red-500">
              ×
            </button>
          </span>
        ))}
        <input
          className="input max-w-[160px] py-1"
          placeholder="태그 추가 후 Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
        />
      </div>
    </div>
  );
}
