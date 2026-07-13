import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeProductInput, ProductError } from "@/lib/creator/products";
import { deletePrivateFile } from "@/lib/storage/private-files";

export const runtime = "nodejs";

// يحمّل منتجاً مملوكاً للمستخدم في الجلسة فقط (ملكية عبر session.sub).
async function loadOwned(id: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      creatorProfile: { select: { userId: true } },
      assets: true,
    },
  });
  if (!product || product.creatorProfile.userId !== userId) return null;
  return product;
}

// PUT — تعديل منتج. ملف جديد يستبدل القديم (حذف ملفه الخاصّ من التخزين).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;
  const product = await loadOwned(id, session.sub);
  if (!product) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }

  let clean;
  try {
    clean = sanitizeProductInput(body);
  } catch (e) {
    if (e instanceof ProductError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        title: clean.title,
        description: clean.description,
        price: clean.price,
        currency: clean.currency,
        images: clean.images as object,
        isActive: clean.isActive,
      },
    });
    // ملف جديد → استبدل الأصل: احذف صفوف الأصول القديمة وأنشئ الجديد.
    if (clean.asset) {
      await tx.productAsset.deleteMany({ where: { productId: product.id } });
      await tx.productAsset.create({
        data: {
          productId: product.id,
          fileKey: clean.asset.fileKey,
          fileName: clean.asset.fileName,
          size: clean.asset.size,
        },
      });
    }
  });

  // حذف ملفات التخزين القديمة بعد نجاح المعاملة (لا يتيمة على القرص).
  if (clean.asset) {
    for (const a of product.assets) {
      if (a.fileKey !== clean.asset.fileKey) await deletePrivateFile(a.fileKey);
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE — حذف منتج + أصوله (cascade في القاعدة) + ملفاته الخاصّة من التخزين.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const { id } = await params;
  const product = await loadOwned(id, session.sub);
  if (!product) {
    return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });
  }

  // Order.productId هو SetNull → سجلّ الطلبات المدفوعة يبقى (لا فقدان بيانات).
  await prisma.product.delete({ where: { id: product.id } });
  for (const a of product.assets) await deletePrivateFile(a.fileKey);

  return NextResponse.json({ ok: true });
}
