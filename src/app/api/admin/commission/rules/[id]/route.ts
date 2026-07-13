import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeRule, RuleError } from "@/lib/commission/rule-input";
import type { CommissionScope, SaleType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 }) };
  if (session.role !== "ADMIN")
    return { error: NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 }) };
  return { session };
}

// PUT — تعديل قاعدة (يشمل التفعيل/التعطيل).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const exists = await prisma.commissionRule.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ ok: false, error: "غير موجود." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  let clean;
  try {
    clean = sanitizeRule(body);
  } catch (e) {
    if (e instanceof RuleError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  await prisma.commissionRule.update({
    where: { id },
    data: {
      scope: clean.scope as CommissionScope,
      targetId: clean.targetId,
      saleType: clean.saleType as SaleType | null,
      percentBps: clean.percentBps,
      fixedAmount: clean.fixedAmount,
      priority: clean.priority,
      startAt: clean.startAt,
      endAt: clean.endAt,
      isActive: clean.isActive,
      label: clean.label,
    },
  });
  return NextResponse.json({ ok: true });
}

// DELETE — حذف قاعدة (لا يؤثّر في سجلّ Ledger — العمولات محفوظة).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  await prisma.commissionRule.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
