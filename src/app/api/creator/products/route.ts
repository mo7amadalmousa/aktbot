import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeProductInput, ProductError } from "@/lib/creator/products";

export const runtime = "nodejs";

// ملف المبدع من الجلسة فقط (ملكية).
async function requireProfile(userId: string) {
  return prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

// GET — منتجات المبدع (لداشبورد الإدارة ومنتقي بلوك المتجر).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const profile = await requireProfile(session.sub);
  if (!profile) return NextResponse.json({ ok: true, products: [] });

  const products = await prisma.product.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      assets: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { fileName: true, size: true },
      },
      _count: { select: { orders: true, modules: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      images: p.images,
      isActive: p.isActive,
      stock: p.stock,
      shippingFee: p.shippingFee,
      file: p.assets[0]
        ? { fileName: p.assets[0].fileName, size: p.assets[0].size }
        : null,
      moduleCount: p._count.modules,
      orderCount: p._count.orders,
    })),
  });
}

// POST — إنشاء منتج رقميّ جديد (مع ملفه الخاصّ إن رُفع).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  }
  const profile = await requireProfile(session.sub);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "لا يوجد ملف." }, { status: 404 });
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

  const product = await prisma.product.create({
    data: {
      creatorProfileId: profile.id,
      type: clean.type,
      title: clean.title,
      description: clean.description,
      price: clean.price,
      currency: clean.currency,
      images: clean.images as object,
      isActive: clean.isActive,
      stock: clean.stock,
      shippingFee: clean.shippingFee,
      ...(clean.asset
        ? {
            assets: {
              create: {
                fileKey: clean.asset.fileKey,
                fileName: clean.asset.fileName,
                size: clean.asset.size,
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: product.id });
}
