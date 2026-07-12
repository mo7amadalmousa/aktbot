import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeSave, SanitizeError } from "@/lib/creator/sanitize";
import type { BlockType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }

  // تنقية خادميّة (S7) — رابط خبيث/تضمين غير مدعوم → 422 قبل أي كتابة.
  let clean;
  try {
    clean = sanitizeSave(body);
  } catch (e) {
    if (e instanceof SanitizeError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  // ملكية: الصفحة تُشتقّ من المستخدم في الجلسة فقط.
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    include: { page: { select: { id: true, blocks: { select: { id: true } } } } },
  });
  if (!profile) {
    return NextResponse.json({ ok: false, error: "لا يوجد ملف." }, { status: 404 });
  }

  // تفرّد اسم المستخدم (استثناء الذات).
  if (clean.username !== profile.username) {
    const taken = await prisma.creatorProfile.findUnique({
      where: { username: clean.username },
      select: { id: true },
    });
    if (taken && taken.id !== profile.id) {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم مستخدم مسبقاً." },
        { status: 409 },
      );
    }
  }

  // تحقّق ملكية البلوكات: أي id وارد يجب أن يخصّ صفحة هذا المستخدم.
  const ownedIds = new Set((profile.page?.blocks ?? []).map((b) => b.id));
  for (const b of clean.blocks) {
    if (b.id && !ownedIds.has(b.id)) {
      return NextResponse.json(
        { ok: false, error: "غير مصرّح بتعديل هذا البلوك." },
        { status: 403 },
      );
    }
  }

  // حفظ ذرّيّ + جمع المعرّفات بالترتيب لإرجاعها للعميل.
  const savedIds = await prisma.$transaction(async (tx) => {
    await tx.creatorProfile.update({
      where: { id: profile.id },
      data: {
        displayName: clean.displayName,
        bio: clean.bio,
        avatarUrl: clean.avatarUrl,
        socialLinks: clean.socialLinks,
        username: clean.username,
        isPublished: clean.isPublished,
      },
    });

    const page = await tx.page.upsert({
      where: { creatorProfileId: profile.id },
      update: {
        theme: clean.theme as object,
        background: clean.background as object,
      },
      create: {
        creatorProfileId: profile.id,
        theme: clean.theme as object,
        background: clean.background as object,
      },
      select: { id: true },
    });

    const keepIds = clean.blocks
      .map((b) => b.id)
      .filter((x): x is string => Boolean(x));
    await tx.block.deleteMany({
      where: {
        pageId: page.id,
        id: { notIn: keepIds.length ? keepIds : ["__none__"] },
      },
    });

    const ids: string[] = [];
    for (const b of clean.blocks) {
      if (b.id) {
        const updated = await tx.block.update({
          where: { id: b.id },
          data: {
            type: b.type as BlockType,
            config: b.config as object,
            visibility: b.visibility,
            order: b.order,
          },
          select: { id: true },
        });
        ids.push(updated.id);
      } else {
        const created = await tx.block.create({
          data: {
            pageId: page.id,
            type: b.type as BlockType,
            config: b.config as object,
            visibility: b.visibility,
            order: b.order,
          },
          select: { id: true },
        });
        ids.push(created.id);
      }
    }
    return ids;
  });

  return NextResponse.json({
    ok: true,
    username: clean.username,
    blockIds: savedIds,
  });
}
