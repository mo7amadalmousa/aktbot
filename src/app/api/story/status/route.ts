import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VISITOR_COOKIE } from "@/lib/story/visitor";

export const runtime = "nodejs";

// هل شاهد هذا الزائر (المجهول) الستوري؟ — يُستخدم لإخفاء VIEW_ONCE المُشاهَدة.
export async function GET(req: NextRequest) {
  const blockId = req.nextUrl.searchParams.get("block") ?? "";
  const vid = req.cookies.get(VISITOR_COOKIE)?.value;

  if (!blockId || !vid) {
    return NextResponse.json({ viewed: false });
  }

  const view = await prisma.storyView.findUnique({
    where: { blockId_visitorId: { blockId, visitorId: vid } },
    select: { id: true },
  });
  return NextResponse.json({ viewed: Boolean(view) });
}
