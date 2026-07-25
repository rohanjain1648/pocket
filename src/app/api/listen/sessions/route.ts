import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoListener } from "@/lib/listener";

export async function POST(req: NextRequest) {
  const { episodeId, progress, completed } = (await req.json()) as {
    episodeId: string;
    progress: number;
    completed?: boolean;
  };

  if (!episodeId || typeof progress !== "number") {
    return NextResponse.json({ ok: false, error: "episodeId and progress are required" }, { status: 400 });
  }

  try {
    const listener = await getDemoListener();
    const clamped = Math.max(0, Math.min(1, progress));

    const existing = await db.listeningSession.findFirst({
      where: { listenerId: listener.id, episodeId },
      orderBy: { startedAt: "desc" },
    });

    const session = existing
      ? await db.listeningSession.update({
          where: { id: existing.id },
          data: { progress: Math.max(existing.progress, clamped), completed: existing.completed || Boolean(completed) },
        })
      : await db.listeningSession.create({
          data: { listenerId: listener.id, episodeId, progress: clamped, completed: Boolean(completed) },
        });

    return NextResponse.json({ ok: true, session: { id: session.id, progress: session.progress, completed: session.completed } });
  } catch (err) {
    console.error("[api/listen/sessions]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Session tracking failed" }, { status: 500 });
  }
}
