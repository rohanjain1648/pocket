import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Saves an edited beat's text. Clears any stale analysis for the beat, since
 * the scores no longer describe the new text — the writer re-runs Analyze
 * (or the live assists) against the updated content.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { text, speaker } = (await req.json()) as { text: string; speaker?: string | null };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "text is required" }, { status: 400 });
  }

  try {
    // deleteMany no-ops (count 0) when there's no analysis row, unlike delete.
    await db.$transaction([
      db.analysis.deleteMany({ where: { beatId: id } }),
      db.beat.update({ where: { id }, data: { text, ...(speaker !== undefined ? { speaker } : {}) } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/beats PATCH]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Update failed" }, { status: 500 });
  }
}
