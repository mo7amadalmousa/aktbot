import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { asRecord, str } from "@/lib/public/block-config";
import { acceptUsageRight, declineUsageRight } from "@/lib/campaign/ugc";

export const runtime = "nodejs";

// المبدع يقبل/يرفض طلب حقوق الاستخدام. القبول → مستحقّ + عمولة + خصم ميزانية الحقوق.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  const { id } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ ok: false, error: "لا ملف مبدع." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const action = str(asRecord(body).action).toLowerCase();

  const res =
    action === "accept"
      ? await acceptUsageRight(id, profile.id)
      : action === "decline"
        ? await declineUsageRight(id, profile.id)
        : { ok: false, error: "إجراء غير صالح." };

  if (!res.ok) {
    const status = res.error === "not_found" ? 404 : 422;
    return NextResponse.json({ ok: false, error: res.error === "not_found" ? "غير موجود." : res.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
