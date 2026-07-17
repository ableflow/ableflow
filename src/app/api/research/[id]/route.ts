import { NextResponse } from "next/server";
import { deleteResearch, getResearch, updateResearch } from "@/lib/research-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const agg = await getResearch(Number(id));
  if (!agg) return NextResponse.json({ error: "조사를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(agg);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.question === "string") patch.question = body.question;
  if (typeof body.field === "string") patch.field = body.field;
  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;
  if (Array.isArray(body.tags)) patch.tags = JSON.stringify(body.tags);
  await updateResearch(Number(id), patch as never);
  const agg = await getResearch(Number(id));
  return NextResponse.json(agg);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteResearch(Number(id));
  return NextResponse.json({ ok: true });
}
